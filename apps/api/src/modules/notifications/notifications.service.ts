import { Injectable } from '@nestjs/common';
import { prisma } from '@ff/database';
import type { Prisma } from '@ff/database';
import type { NotificationTemplate } from '@ff/shared';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly queues: QueueService) {}

  async enqueue(input: {
    orderId: string;
    recipient: string;
    template: NotificationTemplate;
    payload: Prisma.InputJsonObject;
    whatsappConsent: boolean;
  }) {
    if (!input.whatsappConsent) return null;

    const notification = await prisma.notification.create({
      data: {
        orderId: input.orderId,
        recipient: input.recipient,
        template: input.template,
        payload: input.payload,
      },
    });

    try {
      await this.queues.notifications.add(
        'send-whatsapp',
        { notificationId: notification.id },
        {
          jobId: `notification:${notification.id}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    } catch (error) {
      // El pedido no debe fallar si Redis está temporalmente caído.
      // El worker reconcilia las notificaciones PENDING al reiniciar.
      console.error('No se pudo encolar la notificación:', error);
    }

    return notification;
  }
}
