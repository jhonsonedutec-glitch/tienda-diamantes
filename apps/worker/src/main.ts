import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { NotificationStatus, prisma } from '@ff/database';
import { QUEUE_NAMES } from '@ff/shared';
import { Queue, Worker } from 'bullmq';
import { connectionFromUrl } from './redis';
import { WhatsAppClient } from './whatsapp.client';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

const connection = connectionFromUrl(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
);
const whatsapp = new WhatsAppClient();
const notificationQueue = new Queue(QUEUE_NAMES.notifications, { connection });

const notificationWorker = new Worker(
  QUEUE_NAMES.notifications,
  async (job) => {
    const notificationId = String(job.data.notificationId ?? '');
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notificación ${notificationId} no encontrada.`);
    }
    if (notification.status === NotificationStatus.SENT) {
      return { skipped: true, reason: 'already-sent' };
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        attempts: { increment: 1 },
        errorMessage: null,
      },
    });

    try {
      const providerReference = await whatsapp.send({
        to: notification.recipient,
        template: notification.template,
        payload: notification.payload as Record<string, unknown>,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          providerReference,
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      return { providerReference };
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: (error as Error).message.slice(0, 1000),
        },
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  },
);


async function enqueuePendingNotifications() {
  const pending = await prisma.notification.findMany({
    where: { status: NotificationStatus.PENDING },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  for (const item of pending) {
    try {
      await notificationQueue.add(
        'send-whatsapp',
        { notificationId: item.id },
        {
          jobId: `notification:${item.id}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    } catch {
      // El trabajo puede existir ya; BullMQ conservará el existente.
    }
  }
}

void enqueuePendingNotifications();
const reconciliationTimer = setInterval(
  () => void enqueuePendingNotifications(),
  60_000,
);
reconciliationTimer.unref();

notificationWorker.on('completed', (job) => {
  console.info(`Notificación procesada: ${job.id}`);
});
notificationWorker.on('failed', (job, error) => {
  console.error(`Falló la notificación ${job?.id}: ${error.message}`);
});
notificationWorker.on('error', (error) => {
  console.error('Error de Worker:', error);
});

async function shutdown(signal: string) {
  console.info(`Cerrando worker por ${signal}...`);
  clearInterval(reconciliationTimer);
  await notificationWorker.close();
  await notificationQueue.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

console.info('Worker de notificaciones iniciado.');
