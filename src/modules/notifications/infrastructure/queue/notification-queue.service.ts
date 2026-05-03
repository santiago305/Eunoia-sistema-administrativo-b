import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { envs } from 'src/infrastructure/config/envs';
import { NOTIFICATION_DELIVERY_JOB, NOTIFICATION_QUEUE_NAME } from './notification-queue.constants';

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: {
        host: envs.redis.host,
        port: envs.redis.port,
        password: envs.redis.password || undefined,
        db: envs.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }

  async enqueueOutboxDelivery(outboxId: string) {
    await this.queue.add(
      NOTIFICATION_DELIVERY_JOB,
      { outboxId },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
