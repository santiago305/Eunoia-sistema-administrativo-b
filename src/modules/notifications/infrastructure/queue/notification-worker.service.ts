import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { envs } from 'src/infrastructure/config/envs';
import { NotificationsService } from 'src/modules/notifications/application/use-cases/notifications.service';
import { NOTIFICATION_DELIVERY_JOB, NOTIFICATION_QUEUE_NAME } from './notification-queue.constants';

@Injectable()
export class NotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorkerService.name);
  private worker: Worker | null = null;

  constructor(private readonly notificationsService: NotificationsService) {}

  onModuleInit() {
    this.worker = new Worker(
      NOTIFICATION_QUEUE_NAME,
      async (job: Job<{ outboxId: string }>) => {
        if (job.name !== NOTIFICATION_DELIVERY_JOB) return;
        await this.notificationsService.processOutboxDeliveryJob(job.data.outboxId);
      },
      {
        connection: {
          host: envs.redis.host,
          port: envs.redis.port,
          password: envs.redis.password || undefined,
          db: envs.redis.db,
        },
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `notification worker job failed id=${job?.id ?? 'unknown'} outboxId=${job?.data?.outboxId ?? 'unknown'} error=${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
