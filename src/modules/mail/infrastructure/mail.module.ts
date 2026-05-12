import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from '../adapters/in/controllers/notifications.controller';
import { Notification } from '../adapters/out/persistence/typeorm/entities/notification.entity';
import { NotificationRecipient } from '../adapters/out/persistence/typeorm/entities/notification-recipient.entity';
import { NotificationsService } from '../application/use-cases/notifications.service';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { NotificationGateway } from '../adapters/in/websocket/notification.gateway';
import { NotificationRealtimeService } from './realtime/notification-realtime.service';
import { NotificationOutbox } from '../adapters/out/persistence/typeorm/entities/notification-outbox.entity';
import { NotificationDeliveryAttempt } from '../adapters/out/persistence/typeorm/entities/notification-delivery-attempt.entity';
import { NotificationQueueService } from './queue/notification-queue.service';
import { NotificationWorkerService } from './queue/notification-worker.service';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { MessageEntity } from '../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageThread } from '../adapters/out/persistence/typeorm/entities/message-thread.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationRecipient,
      NotificationOutbox,
      NotificationDeliveryAttempt,
      MessageEntity,
      MessageRecipientEntity,
      MessageThread,
      User,
    ]),
    AccessControlModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRealtimeService,
    NotificationGateway,
    NotificationQueueService,
    NotificationWorkerService,
  ],
  exports: [NotificationsService, NotificationRealtimeService, NotificationQueueService],
})
export class MailModule {}
