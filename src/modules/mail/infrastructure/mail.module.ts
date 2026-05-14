import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from '../adapters/in/controllers/notifications.controller';
import { NotificationsService } from '../application/use-cases/notifications.service';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { NotificationGateway } from '../adapters/in/websocket/notification.gateway';
import { NotificationRealtimeService } from './realtime/notification-realtime.service';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { MessageEntity } from '../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageThread } from '../adapters/out/persistence/typeorm/entities/message-thread.entity';
import { MessageLabelEntity } from '../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageMessageLabelEntity } from '../adapters/out/persistence/typeorm/entities/message-message-label.entity';
import { MessageUserStateEntity } from '../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageAttachmentEntity } from '../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MessageLabelAssignmentEntity } from '../adapters/out/persistence/typeorm/entities/message-label-assignment.entity';
import { MessageSearchHistoryEntity } from '../adapters/out/persistence/typeorm/entities/message-search-history.entity';
import { MessageAuditLogEntity } from '../adapters/out/persistence/typeorm/entities/message-audit-log.entity';
import { ExpireDraftsJob } from './jobs/expire-drafts.job';
import { ExpireTrashJob } from './jobs/expire-trash.job';
import { ReleaseSnoozedMessagesJob } from './jobs/release-snoozed-messages.job';
import { CleanOrphanAttachmentsJob } from './jobs/clean-orphan-attachments.job';
import { CreateYearlyPartitionsJob } from './jobs/create-yearly-partitions.job';
import { MailJobsScheduler } from './jobs/mail-jobs.scheduler';
import { MessageStateService } from '../application/services/message-state.service';
import { MessageAccessService } from '../application/services/message-access.service';
import { NotificationLabelsService } from '../application/services/notification-labels.service';
import { NotificationAttachmentsService } from '../application/services/notification-attachments.service';
import { NotificationQueriesService } from '../application/services/notification-queries.service';
import { ACCESS_CONTROL_PORT } from '../application/ports/access-control.port';
import { AccessControlAdapter } from '../adapters/out/access-control/access-control.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageEntity,
      MessageRecipientEntity,
      MessageThread,
      MessageLabelEntity,
      MessageMessageLabelEntity,
      MessageUserStateEntity,
      MessageAttachmentEntity,
      MessageLabelAssignmentEntity,
      MessageSearchHistoryEntity,
      MessageAuditLogEntity,
      User,
    ]),
    AccessControlModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    MessageStateService,
    MessageAccessService,
    NotificationLabelsService,
    NotificationAttachmentsService,
    NotificationQueriesService,
    AccessControlAdapter,
    { provide: ACCESS_CONTROL_PORT, useExisting: AccessControlAdapter },
    NotificationRealtimeService,
    NotificationGateway,
    ExpireDraftsJob,
    ExpireTrashJob,
    ReleaseSnoozedMessagesJob,
    CleanOrphanAttachmentsJob,
    CreateYearlyPartitionsJob,
    MailJobsScheduler,
  ],
  exports: [NotificationsService, NotificationRealtimeService],
})
export class MailModule {}
