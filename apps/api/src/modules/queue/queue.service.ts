import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@ff/shared';
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

function connectionFromUrl(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname ? Number(url.pathname.slice(1) || 0) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly notifications: Queue;
  readonly fulfillment: Queue;

  constructor(config: ConfigService) {
    const connection = connectionFromUrl(
      config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
    );

    this.notifications = new Queue(QUEUE_NAMES.notifications, { connection });
    this.fulfillment = new Queue(QUEUE_NAMES.fulfillment, { connection });
  }

  async onModuleDestroy() {
    await Promise.all([
      this.notifications.close(),
      this.fulfillment.close(),
    ]);
  }
}
