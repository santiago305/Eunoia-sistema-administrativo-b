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
import { NotificationModuleLabelConfigEntity } from '../adapters/out/persistence/typeorm/entities/notification-module-label-config.entity';
import { MessageActionEntity } from '../adapters/out/persistence/typeorm/entities/message-action.entity';
import { MessageActionRecipientEntity } from '../adapters/out/persistence/typeorm/entities/message-action-recipient.entity';
import { MailStorageQuotaEntity } from '../adapters/out/persistence/typeorm/entities/mail-storage-quota.entity';
import { MailAttachmentUserRefEntity } from '../adapters/out/persistence/typeorm/entities/mail-attachment-user-ref.entity';
import { ApprovalRequestEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity';
import { PurchaseOrderEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
import { PaymentDocumentEntity } from 'src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity';
import { ExpireDraftsJob } from './jobs/expire-drafts.job';
import { ExpireTrashJob } from './jobs/expire-trash.job';
import { ReleaseSnoozedMessagesJob } from './jobs/release-snoozed-messages.job';
import { ReleaseScheduledMessagesJob } from './jobs/release-scheduled-messages.job';
import { CleanOrphanAttachmentsJob } from './jobs/clean-orphan-attachments.job';
import { CreateYearlyPartitionsJob } from './jobs/create-yearly-partitions.job';
import { MailJobsScheduler } from './jobs/mail-jobs.scheduler';
import { MessageStateService } from '../application/services/message-state.service';
import { MessageAccessService } from '../application/services/message-access.service';
import { NotificationLabelsService } from '../application/services/notification-labels.service';
import { NotificationAttachmentsService } from '../application/services/notification-attachments.service';
import { NotificationQueriesService } from '../application/services/notification-queries.service';
import { MessageContentService } from '../application/services/message-content.service';
import { MessageRecipientsResolverService } from '../application/services/message-recipients-resolver.service';
import { MessageAuditService } from '../application/services/message-audit.service';
import { MessageUserStatesService } from '../application/services/message-user-states.service';
import { MessageRealtimeEventsService } from '../application/services/message-realtime-events.service';
import { NotificationPayloadMapperService } from '../application/services/notification-payload-mapper.service';
import { MessageUserStateAccessService } from '../application/services/message-user-state-access.service';
import { SystemNotificationService } from '../application/services/system-notification.service';
import { MessageActionsService } from '../application/services/message-actions.service';
import { MailStorageQuotaService } from '../application/services/mail-storage-quota.service';
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
      NotificationModuleLabelConfigEntity,
      MessageActionEntity,
      MessageActionRecipientEntity,
      MailStorageQuotaEntity,
      MailAttachmentUserRefEntity,
      ApprovalRequestEntity,
      PurchaseOrderEntity,
      PaymentDocumentEntity,
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
    MessageContentService,
    MessageRecipientsResolverService,
    MessageAuditService,
    MessageUserStatesService,
    MessageRealtimeEventsService,
    NotificationPayloadMapperService,
    MessageUserStateAccessService,
    SystemNotificationService,
    MessageActionsService,
    MailStorageQuotaService,
    AccessControlAdapter,
    { provide: ACCESS_CONTROL_PORT, useExisting: AccessControlAdapter },
    NotificationRealtimeService,
    NotificationGateway,
    ExpireDraftsJob,
    ExpireTrashJob,
    ReleaseSnoozedMessagesJob,
    ReleaseScheduledMessagesJob,
    CleanOrphanAttachmentsJob,
    CreateYearlyPartitionsJob,
    MailJobsScheduler,
  ],
  exports: [NotificationsService, NotificationRealtimeService],
})
export class MailModule {}
