import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageThread } from '../../adapters/out/persistence/typeorm/entities/message-thread.entity';
import { MessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MessageLabelAssignmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-label-assignment.entity';
import { NotificationModuleLabelConfigEntity } from '../../adapters/out/persistence/typeorm/entities/notification-module-label-config.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';
import { MessageStateService } from '../services/message-state.service';
import { MessageAccessService } from '../services/message-access.service';
import { NotificationLabelsService } from '../services/notification-labels.service';
import { NotificationAttachmentsService } from '../services/notification-attachments.service';
import { NotificationQueriesService } from '../services/notification-queries.service';
import { MessageContentService } from '../services/message-content.service';
import { MessageRecipientsResolverService } from '../services/message-recipients-resolver.service';
import { MessageAuditService } from '../services/message-audit.service';
import { MessageUserStatesService } from '../services/message-user-states.service';
import { MessageRealtimeEventsService } from '../services/message-realtime-events.service';
import { MessageUserStateAccessService } from '../services/message-user-state-access.service';
import { SystemNotificationService } from '../services/system-notification.service';
import { MessageActionsService } from '../services/message-actions.service';
import { MailStorageQuotaService } from '../services/mail-storage-quota.service';
import { ORIGIN_MODULE } from '../../domain/enums/origin-module.enum';
import { normalizeOriginModule } from '../../domain/utils/normalize-origin-module';
import {
  NOTIFICATION_MODULE_ICONS,
  NOTIFICATION_MODULE_LABELS,
  NOTIFICATION_MODULE_PERMISSIONS,
} from '../constants/notification-module-permissions';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageRecipientEntity)
    private readonly messageRecipientRepository: Repository<MessageRecipientEntity>,
    @InjectRepository(MessageThread)
    private readonly messageThreadRepository: Repository<MessageThread>,
    @InjectRepository(MessageLabelEntity)
    private readonly messageLabelRepository: Repository<MessageLabelEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly messageAttachmentRepository: Repository<MessageAttachmentEntity>,
    @InjectRepository(MessageLabelAssignmentEntity)
    private readonly messageLabelAssignmentRepository: Repository<MessageLabelAssignmentEntity>,
    @InjectRepository(NotificationModuleLabelConfigEntity)
    private readonly notificationModuleLabelConfigRepository: Repository<NotificationModuleLabelConfigEntity>,
    private readonly dataSource: DataSource,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
    private readonly messageStateService: MessageStateService,
    private readonly messageAccessService: MessageAccessService,
    private readonly notificationLabelsService: NotificationLabelsService,
    private readonly notificationAttachmentsService: NotificationAttachmentsService,
    private readonly notificationQueriesService: NotificationQueriesService,
    private readonly messageContentService: MessageContentService,
    private readonly messageRecipientsResolverService: MessageRecipientsResolverService,
    private readonly messageAuditService: MessageAuditService,
    private readonly messageUserStatesService: MessageUserStatesService,
    private readonly messageRealtimeEventsService: MessageRealtimeEventsService,
    private readonly messageUserStateAccessService: MessageUserStateAccessService,
    private readonly systemNotificationService: SystemNotificationService,
    private readonly messageActionsService: MessageActionsService,
    private readonly mailStorageQuotaService: MailStorageQuotaService,
  ) {}

  private ensureUserReplyableMessage(parent: MessageEntity) {
    if (parent.senderType === 'SYSTEM' || parent.kind !== 'USER_MESSAGE') {
      throw new BadRequestException('SYSTEM_MESSAGE_NOT_REPLYABLE');
    }
  }

  private buildForwardedMessageMetadata(
    parent: MessageEntity,
    sender: Pick<User, 'name' | 'email'> | null,
  ) {
    return {
      id: parent.id,
      subject: parent.subject,
      senderName: sender?.name ?? 'Usuario',
      senderEmail: sender?.email ?? '',
      sentAt: (parent.sentAt ?? parent.createdAt)?.toISOString?.() ?? null,
      bodyPreview: (parent.bodyText || this.messageContentService.toBodyText(parent.bodyHtml)).slice(0, 500),
      attachmentSummary: [],
    };
  }

  private normalizeConversationSubject(subject: string) {
    return String(subject ?? '').replace(/^(?:\s*(?:re|fwd):\s*)+/i, '').trim() || '(Sin asunto)';
  }

  private async assertSuperAdminOrFail(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'deleted', 'isSuperAdmin'],
    });
    if (!user || user.deleted) {
      throw new ForbiddenException('SUPERADMIN_REQUIRED');
    }
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('SUPERADMIN_REQUIRED');
    }
  }

  private async buildThreadItems(message: MessageEntity, userId: string) {
    const isGroupedSystemThread = Boolean(
      message.senderType === 'SYSTEM' &&
      message.sourceEntityType &&
      message.sourceEntityId,
    );
    const threadMessages = message.threadId
      ? await this.messageRepository.find({
          where: { threadId: message.threadId },
          order: isGroupedSystemThread ? { createdAt: 'DESC' } : { createdAt: 'ASC' },
        })
      : [message];
    const messageIds = threadMessages.map((item) => item.id);
    const senderIds = Array.from(new Set(threadMessages.map((item) => item.senderUserId).filter(Boolean))) as string[];
    const senders = senderIds.length
      ? await this.userRepository.find({
          where: senderIds.map((id) => ({ id })),
          select: ['id', 'name', 'email'],
        })
      : [];
    const recipients = messageIds.length
      ? await this.messageUserStateRepository.find({
          where: messageIds.map((messageId) => ({ messageId })),
        })
      : [];
    const attachments = messageIds.length
      ? await this.messageAttachmentRepository.find({
          where: messageIds.map((messageId) => ({ messageId })),
        })
      : [];
    const senderMap = new Map(senders.map((sender) => [sender.id, sender]));
    const recipientsByMessage = new Map<string, MessageUserStateEntity[]>();
    recipients.forEach((recipient) => {
      const bucket = recipientsByMessage.get(recipient.messageId) ?? [];
      bucket.push(recipient);
      recipientsByMessage.set(recipient.messageId, bucket);
    });
    const attachmentsByMessage = new Map<string, MessageAttachmentEntity[]>();
    attachments.forEach((attachment) => {
      if (!attachment.messageId) return;
      const bucket = attachmentsByMessage.get(attachment.messageId) ?? [];
      bucket.push(attachment);
      attachmentsByMessage.set(attachment.messageId, bucket);
    });
    const threadActions = await this.messageActionsService.listThreadActionsForMessages(userId, {
      threadId: message.threadId,
      messageIds,
    });
    const actionsByMessageId = new Map<string, Array<Record<string, unknown>>>();
    const threadLevelActions: Array<Record<string, unknown>> = [];
    threadActions.forEach((action) => {
      if (action.messageId) {
        const bucket = actionsByMessageId.get(action.messageId) ?? [];
        bucket.push(action);
        actionsByMessageId.set(action.messageId, bucket);
      } else {
        threadLevelActions.push(action);
      }
    });
    const threadLevelTargetId = threadMessages[0]?.id ?? null;
    if (threadLevelTargetId && threadLevelActions.length) {
      const bucket = actionsByMessageId.get(threadLevelTargetId) ?? [];
      bucket.push(...threadLevelActions);
      actionsByMessageId.set(threadLevelTargetId, bucket);
    }

    return threadMessages.map((threadMessage, index) => ({
      ...threadMessage,
      sender: threadMessage.senderUserId ? senderMap.get(threadMessage.senderUserId) ?? null : null,
      recipients: recipientsByMessage.get(threadMessage.id) ?? [],
      attachments: attachmentsByMessage.get(threadMessage.id) ?? [],
      actions: actionsByMessageId.get(threadMessage.id) ?? [],
      threadMessageCount: threadMessages.length,
      threadLatestIndex: isGroupedSystemThread ? index + 1 : threadMessages.length,
      threadLabel: isGroupedSystemThread ? `Sistema ${index + 1} de ${threadMessages.length} mensajes` : null,
    }));
  }

  async getAllowedNotificationModules(userId: string) {
    const allowedModules = await this.accessControlPort.getAllowedNotificationModules(
      userId,
      NOTIFICATION_MODULE_PERMISSIONS,
    );

    const labels = NOTIFICATION_MODULE_LABELS;
    const icons = NOTIFICATION_MODULE_ICONS;

    return allowedModules
      .map((moduleKey) => ({
        key: moduleKey,
        label: labels[moduleKey] ?? moduleKey,
        icon: icons[moduleKey] ?? 'Bell',
      }));
  }

  async canOpenMessage(userId: string, messageId: string) {
    const ownMessage = await this.messageRepository.findOne({ where: { id: messageId, senderUserId: userId } });
    if (ownMessage) {
      const allowed = await this.accessControlPort.canOpenMessage(
        userId,
        ownMessage.id,
        ownMessage.originModule,
        NOTIFICATION_MODULE_PERMISSIONS[ownMessage.originModule] ?? ['page.notifications.view'],
      );
      return allowed;
    }
    const state = await this.messageUserStateRepository.findOne({ where: { messageId, userId } });
    if (!state) return false;
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) return false;
    return this.accessControlPort.canOpenMessage(
      userId,
      message.id,
      message.originModule,
      NOTIFICATION_MODULE_PERMISSIONS[message.originModule] ?? ['page.notifications.view'],
    );
  }

  private async ensureCanAccessModule(userId: string, moduleKey: string) {
    if (!NOTIFICATION_MODULE_PERMISSIONS[moduleKey]) {
      throw new BadRequestException('ORIGIN_MODULE_REQUIRED');
    }
    await this.messageAccessService.ensureCanAccessModule(userId, moduleKey, NOTIFICATION_MODULE_PERMISSIONS);
  }

  private async ensureCanOpenMessageOrThrow(userId: string, messageId: string) {
    const allowed = await this.canOpenMessage(userId, messageId);
    if (!allowed) {
      throw new ForbiddenException('MESSAGE_ACCESS_DENIED');
    }
  }

  private validateScheduledAtOrThrow(scheduledAtIso: string) {
    const scheduledAt = new Date(scheduledAtIso);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('SCHEDULE_DATE_INVALID');
    }
    const minLeadMs = 60_000;
    if (scheduledAt.getTime() <= Date.now() + minLeadMs) {
      throw new BadRequestException('SCHEDULE_DATE_INVALID');
    }
    return scheduledAt;
  }

  private getScheduledLabelIds(bodyJson?: Record<string, unknown> | null) {
    const raw = bodyJson && typeof bodyJson === 'object' ? bodyJson.scheduledLabelIds : [];
    if (!Array.isArray(raw)) return [];
    return raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }

  private async releaseScheduledMessageInTransaction(
    manager: EntityManager,
    input: {
      messageId: string;
      actorUserId?: string | null;
      force: boolean;
      auditAction: string;
    },
  ) {
    const now = new Date();
    const messageRepo = manager.getRepository(MessageEntity);
    const recipientRepo = manager.getRepository(MessageRecipientEntity);
    const claimQb = messageRepo
      .createQueryBuilder()
      .update(MessageEntity)
      .set({ status: 'SENT', sentAt: now, scheduledAt: null, updatedAt: now })
      .where('id = :id', { id: input.messageId })
      .andWhere("status = 'SCHEDULED'");

    if (!input.force) {
      claimQb.andWhere('scheduled_at IS NOT NULL').andWhere('scheduled_at <= :releaseNow', { releaseNow: now });
    }

    const claimed = await claimQb.execute();
    if (!(claimed.affected ?? 0)) return null;

    const message = await messageRepo.findOne({ where: { id: input.messageId } });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    const senderUserId = message.senderUserId ?? message.createdByUserId ?? input.actorUserId ?? null;
    if (!senderUserId) throw new BadRequestException('SCHEDULED_SENDER_NOT_FOUND');

    const recipients = await recipientRepo.find({ where: { messageId: message.id } });
    if (!recipients.length) throw new BadRequestException('SCHEDULED_RECIPIENTS_NOT_FOUND');
    recipients.forEach((recipient) => {
      recipient.deliveredAt = recipient.deliveredAt ?? now;
    });
    const savedRecipients = await recipientRepo.save(recipients);
    const resolvedRecipients = savedRecipients
      .filter((recipient) => Boolean(recipient.recipientUserId))
      .map((recipient) => {
        const relationType: 'TO' | 'CC' | 'BCC' =
          recipient.recipientType === 'CC'
            ? 'CC'
            : recipient.recipientType === 'BCC'
              ? 'BCC'
              : 'TO';
        return {
          id: recipient.recipientUserId!,
          email: recipient.recipientEmail,
          relationType,
        };
      });
    if (!resolvedRecipients.length) throw new BadRequestException('SCHEDULED_RECIPIENTS_NOT_FOUND');

    const states = await this.messageUserStatesService.createMessageUserStates(
      {
        message,
        senderUserId,
        recipients: resolvedRecipients,
      },
      manager,
    );
    const senderState = states.find((state) => state.userId === senderUserId && state.relationType === 'SENDER');
    if (senderState) {
      await this.notificationLabelsService.assignLabelsToState(
        senderState.id,
        senderUserId,
        this.getScheduledLabelIds(message.bodyJson),
        manager,
      );
    }
    const messageAttachments = await manager.getRepository(MessageAttachmentEntity).find({
      where: { messageId: message.id },
      select: ['id'],
    });
    await this.mailStorageQuotaService.ensureAttachmentRefsForUsers({
      attachmentIds: messageAttachments.map((attachment) => attachment.id),
      userIds: [senderUserId, ...resolvedRecipients.map((recipient) => recipient.id)],
      messageId: message.id,
      manager,
    });

    await this.messageAuditService.createAuditLog(
      {
        action: input.auditAction,
        actorUserId: input.actorUserId ?? senderUserId,
        messageId: message.id,
        threadId: message.threadId,
        metadata: {
          recipients: resolvedRecipients.map((recipient) => recipient.email),
          releasedAt: now.toISOString(),
        },
      },
      manager,
    );

    return { message, recipients: savedRecipients, senderUserId };
  }

  async sendMessage(input: {
    senderUserId: string;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    subject: string;
    bodyHtml: string;
    bodyJson?: Record<string, unknown> | null;
    originModule?: string;
    labelIds?: string[];
    attachmentIds?: string[];
  }) {
    const { recipients: resolvedRecipients } = await this.messageRecipientsResolverService.resolveRecipientsByBucketsOrFail({
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      recipients: input.recipients,
    });

    const originModule = normalizeOriginModule(input.originModule, ORIGIN_MODULE.CORPORATE);
    await this.ensureCanAccessModule(input.senderUserId, originModule);
    const bodyHtml = this.messageContentService.normalizeHtmlBody(input.bodyHtml);
    const bodyText = this.messageContentService.toBodyText(bodyHtml);
    const txResult = await this.dataSource.transaction(async (manager) => {
      const threadRepo = manager.getRepository(MessageThread);
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const thread = await threadRepo.save(
        threadRepo.create({
          subject: input.subject,
          createdByUserId: input.senderUserId,
          originModule,
          lastMessageAt: new Date(),
        }),
      );

      const message = await messageRepo.save(
        messageRepo.create({
          threadId: thread.id,
          parentMessageId: null,
          kind: 'USER_MESSAGE',
          originModule,
          senderType: 'USER',
          senderUserId: input.senderUserId,
          createdByUserId: input.senderUserId,
          subject: input.subject,
          bodyHtml,
          bodyText,
          bodyJson: input.bodyJson ?? null,
          status: 'SENT',
          isDraft: false,
          draftExpiresAt: null,
          sentAt: new Date(),
          sourceEntityType: null,
          sourceEntityId: null,
        }),
      );

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      const states = await this.messageUserStatesService.createMessageUserStates(
        {
          message,
          senderUserId: input.senderUserId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.notificationAttachmentsService.linkAttachmentsToMessage(input.senderUserId, message.id, input.attachmentIds ?? [], undefined, manager);
      await this.mailStorageQuotaService.ensureAttachmentRefsForUsers({
        attachmentIds: input.attachmentIds ?? [],
        userIds: [input.senderUserId, ...resolvedRecipients.map((user) => user.id)],
        messageId: message.id,
        manager,
      });
      const senderState = states.find((state) => state.userId === input.senderUserId && state.relationType === 'SENDER');
      if (senderState) {
        await this.notificationLabelsService.assignLabelsToState(senderState.id, input.senderUserId, input.labelIds ?? [], manager);
      }

      await this.messageAuditService.createAuditLog(
        {
          action: 'MESSAGE_SENT',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
            originModule,
          },
        },
        manager,
      );

      return { message, thread, recipients: savedRecipients };
    });

    await this.messageRealtimeEventsService.emitMessageCreatedToRecipients(input.senderUserId, txResult.message, txResult.recipients);

    return { id: txResult.message.id, threadId: txResult.thread.id, recipients: txResult.recipients.length };
  }

  async createScheduledMessage(input: {
    senderUserId: string;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    subject: string;
    bodyHtml: string;
    bodyJson?: Record<string, unknown> | null;
    scheduledAt: string;
    originModule?: string;
    labelIds?: string[];
    attachmentIds?: string[];
  }) {
    const scheduledAt = this.validateScheduledAtOrThrow(input.scheduledAt);
    const { recipients: resolvedRecipients } = await this.messageRecipientsResolverService.resolveRecipientsByBucketsOrFail({
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      recipients: input.recipients,
    });

    const originModule = normalizeOriginModule(input.originModule, ORIGIN_MODULE.CORPORATE);
    await this.ensureCanAccessModule(input.senderUserId, originModule);

    const bodyHtml = this.messageContentService.normalizeHtmlBody(input.bodyHtml);
    const bodyText = this.messageContentService.toBodyText(bodyHtml);
    const scheduledLabelIds = Array.from(new Set((input.labelIds ?? []).filter(Boolean)));
    const bodyJson = {
      ...(input.bodyJson ?? {}),
      scheduledLabelIds,
    };

    const txResult = await this.dataSource.transaction(async (manager) => {
      const threadRepo = manager.getRepository(MessageThread);
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const thread = await threadRepo.save(
        threadRepo.create({
          subject: input.subject,
          createdByUserId: input.senderUserId,
          originModule,
          lastMessageAt: scheduledAt,
        }),
      );

      const message = await messageRepo.save(
        messageRepo.create({
          threadId: thread.id,
          parentMessageId: null,
          kind: 'USER_MESSAGE',
          originModule,
          senderType: 'USER',
          senderUserId: input.senderUserId,
          createdByUserId: input.senderUserId,
          subject: input.subject,
          bodyHtml,
          bodyText,
          bodyJson,
          status: 'SCHEDULED',
          isDraft: false,
          draftExpiresAt: null,
          scheduledAt,
          sentAt: null,
          sourceEntityType: null,
          sourceEntityId: null,
        }),
      );

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: null,
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);

      await this.notificationAttachmentsService.linkAttachmentsToMessage(
        input.senderUserId,
        message.id,
        input.attachmentIds ?? [],
        undefined,
        manager,
      );
      await this.mailStorageQuotaService.ensureAttachmentRefsForUsers({
        attachmentIds: input.attachmentIds ?? [],
        userIds: [input.senderUserId],
        messageId: message.id,
        manager,
      });
      await this.messageAuditService.createAuditLog(
        {
          action: 'MESSAGE_SCHEDULED',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            scheduledAt: scheduledAt.toISOString(),
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
            originModule,
          },
        },
        manager,
      );

      return { message, thread, recipients: savedRecipients };
    });

    return {
      id: txResult.message.id,
      threadId: txResult.thread.id,
      recipients: txResult.recipients.length,
      scheduledAt: scheduledAt.toISOString(),
    };
  }

  async rescheduleMessage(userId: string, messageId: string, scheduledAtIso: string) {
    const scheduledAt = this.validateScheduledAtOrThrow(scheduledAtIso);
    const message = await this.messageRepository.findOne({
      where: { id: messageId, createdByUserId: userId, status: 'SCHEDULED', isDraft: false },
    });
    if (!message) throw new NotFoundException('SCHEDULED_MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(userId, message.originModule);

    message.scheduledAt = scheduledAt;
    message.updatedAt = new Date();
    const saved = await this.messageRepository.save(message);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_RESCHEDULED',
      actorUserId: userId,
      messageId: saved.id,
      threadId: saved.threadId,
      metadata: { scheduledAt: scheduledAt.toISOString() },
    });
    return { id: saved.id, scheduledAt: saved.scheduledAt?.toISOString() ?? null };
  }

  async cancelScheduledMessage(userId: string, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, createdByUserId: userId, status: 'SCHEDULED', isDraft: false },
    });
    if (!message) throw new NotFoundException('SCHEDULED_MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(userId, message.originModule);

    const now = new Date();
    message.status = 'DRAFT';
    message.isDraft = true;
    message.scheduledAt = null;
    message.sentAt = null;
    message.draftExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    message.lastAutosavedAt = now;
    message.updatedAt = now;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(MessageEntity).save(message);
      await manager.getRepository(MessageRecipientEntity).delete({ messageId: message.id });
      await this.messageAuditService.createAuditLog(
        {
          action: 'MESSAGE_SCHEDULE_CANCELED',
          actorUserId: userId,
          messageId: message.id,
          threadId: message.threadId,
        },
        manager,
      );
    });

    return { id: message.id, status: message.status, isDraft: message.isDraft };
  }

  async sendScheduledMessageNow(userId: string, messageId: string) {
    const scheduledMessage = await this.messageRepository.findOne({
      where: { id: messageId, createdByUserId: userId, status: 'SCHEDULED', isDraft: false },
    });
    if (!scheduledMessage) throw new NotFoundException('SCHEDULED_MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(userId, scheduledMessage.originModule);

    const released = await this.dataSource.transaction((manager) =>
      this.releaseScheduledMessageInTransaction(manager, {
        messageId,
        actorUserId: userId,
        force: true,
        auditAction: 'MESSAGE_SCHEDULED_SENT_NOW',
      }),
    );
    if (!released) throw new BadRequestException('SCHEDULED_MESSAGE_INVALID_STATE');

    await this.messageRealtimeEventsService.emitMessageCreatedToRecipients(
      released.senderUserId,
      released.message,
      released.recipients,
    );
    this.messageRealtimeEventsService.emitScheduledMessageReleasedToSender(
      released.senderUserId,
      released.message,
    );

    return { id: released.message.id, status: released.message.status, sentAt: released.message.sentAt };
  }

  async releaseDueScheduledMessages(limit = 50) {
    const releaseNow = new Date();
    const dueIds = await this.messageRepository
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .where("m.status = 'SCHEDULED'")
      .andWhere('m.scheduled_at IS NOT NULL')
      .andWhere('m.scheduled_at <= :releaseNow', { releaseNow })
      .orderBy('m.scheduled_at', 'ASC')
      .limit(Math.max(1, limit))
      .getRawMany<{ id: string }>();

    let releasedCount = 0;
    for (const row of dueIds) {
      const released = await this.dataSource.transaction((manager) =>
        this.releaseScheduledMessageInTransaction(manager, {
          messageId: row.id,
          actorUserId: null,
          force: false,
          auditAction: 'MESSAGE_SCHEDULED_RELEASED',
        }),
      );
      if (!released) continue;
      releasedCount += 1;
      await this.messageRealtimeEventsService.emitMessageCreatedToRecipients(
        released.senderUserId,
        released.message,
        released.recipients,
      );
      this.messageRealtimeEventsService.emitScheduledMessageReleasedToSender(
        released.senderUserId,
        released.message,
      );
    }
    return { released: releasedCount };
  }

  async replyMessage(input: {
    senderUserId: string;
    parentMessageId: string;
    bodyHtml: string;
    bodyJson?: Record<string, unknown> | null;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    attachmentIds?: string[];
  }) {
    const parent = await this.messageRepository.findOne({ where: { id: input.parentMessageId } });
    if (!parent) throw new NotFoundException('MESSAGE_NOT_FOUND');
    this.ensureUserReplyableMessage(parent);
    await this.ensureCanOpenMessageOrThrow(input.senderUserId, parent.id);
    await this.ensureCanAccessModule(input.senderUserId, parent.originModule);

    let resolvedRecipients: Array<{ id: string; email: string; name: string; relationType: 'TO' | 'CC' | 'BCC' }> = [];
    const hasTypedRecipients =
      this.messageRecipientsResolverService.hasAnyRecipient({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        recipients: input.recipients,
      });
    if (hasTypedRecipients) {
      const resolved = await this.messageRecipientsResolverService.resolveRecipientsByBucketsOrFail({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        recipients: input.recipients,
      });
      resolvedRecipients = resolved.recipients;
    } else if (parent.senderUserId && parent.senderUserId !== input.senderUserId) {
      const fallback = await this.userRepository.findOne({
        where: { id: parent.senderUserId },
        select: ['id', 'email', 'name'],
      });
      resolvedRecipients = fallback ? [{ ...fallback, relationType: 'TO' }] : [];
    }
    if (!resolvedRecipients.length) {
      throw new BadRequestException('RECIPIENT_EMAIL_NOT_FOUND');
    }

    const bodyHtml = this.messageContentService.normalizeHtmlBody(input.bodyHtml);
    const bodyText = this.messageContentService.toBodyText(bodyHtml);
    const txResult = await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(MessageEntity);
      const threadRepo = manager.getRepository(MessageThread);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const message = await messageRepo.save(
        messageRepo.create({
          threadId: parent.threadId,
          parentMessageId: parent.id,
          kind: 'USER_MESSAGE',
          originModule: parent.originModule,
          sourceEntityType: parent.sourceEntityType,
          sourceEntityId: parent.sourceEntityId,
          senderType: 'USER',
          senderUserId: input.senderUserId,
          createdByUserId: input.senderUserId,
          subject: this.normalizeConversationSubject(parent.subject),
          bodyHtml,
          bodyText,
          bodyJson: input.bodyJson ?? null,
          status: 'SENT',
          isDraft: false,
          draftExpiresAt: null,
          sentAt: new Date(),
        }),
      );

      if (parent.threadId) {
        await threadRepo.update({ id: parent.threadId }, { lastMessageAt: new Date(), updatedAt: new Date() });
      }

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      await this.messageUserStatesService.createMessageUserStates(
        {
          message,
          senderUserId: input.senderUserId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.notificationAttachmentsService.linkAttachmentsToMessage(input.senderUserId, message.id, input.attachmentIds ?? [], undefined, manager);
      await this.mailStorageQuotaService.ensureAttachmentRefsForUsers({
        attachmentIds: input.attachmentIds ?? [],
        userIds: [input.senderUserId, ...resolvedRecipients.map((user) => user.id)],
        messageId: message.id,
        manager,
      });
      await this.messageAuditService.createAuditLog(
        {
          action: 'MESSAGE_REPLIED',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            parentMessageId: parent.id,
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
          },
        },
        manager,
      );
      return { message, recipients: savedRecipients };
    });
    await this.messageRealtimeEventsService.emitMessageCreatedToRecipients(input.senderUserId, txResult.message, txResult.recipients);

    return { id: txResult.message.id, threadId: txResult.message.threadId, recipients: txResult.recipients.length };
  }

  async listMyLabels(userId: string) {
    return this.notificationLabelsService.listMyLabels(userId);
  }

  async listModuleLabelConfigs() {
    const rows = await this.notificationModuleLabelConfigRepository.find({
      order: { moduleKey: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      moduleKey: row.moduleKey,
      labelId: row.labelId,
      updatedByUserId: row.updatedByUserId,
      updatedAt: row.updatedAt,
    }));
  }

  async upsertModuleLabelConfig(userId: string, moduleKeyRaw: string, labelId?: string | null) {
    const moduleKey = String(moduleKeyRaw ?? '').trim().toLowerCase();
    if (!NOTIFICATION_MODULE_PERMISSIONS[moduleKey]) {
      throw new BadRequestException('ORIGIN_MODULE_REQUIRED');
    }

    let targetLabelId: string | null = null;
    if (labelId) {
      const label = await this.messageLabelRepository.findOne({
        where: [{ id: labelId, isVisible: true, ownerUserId: null }, { id: labelId, isVisible: true, ownerUserId: userId }],
        select: ['id'],
      });
      if (!label) {
        throw new NotFoundException('LABEL_NOT_FOUND');
      }
      targetLabelId = label.id;
    }

    const current = await this.notificationModuleLabelConfigRepository.findOne({ where: { moduleKey } });
    if (current) {
      current.labelId = targetLabelId;
      current.updatedByUserId = userId;
      const saved = await this.notificationModuleLabelConfigRepository.save(current);
      return { id: saved.id, moduleKey: saved.moduleKey, labelId: saved.labelId, updatedByUserId: saved.updatedByUserId, updatedAt: saved.updatedAt };
    }

    const created = await this.notificationModuleLabelConfigRepository.save(
      this.notificationModuleLabelConfigRepository.create({
        moduleKey,
        labelId: targetLabelId,
        updatedByUserId: userId,
      }),
    );
    return { id: created.id, moduleKey: created.moduleKey, labelId: created.labelId, updatedByUserId: created.updatedByUserId, updatedAt: created.updatedAt };
  }

  async createCustomLabel(userId: string, name: string, color: string) {
    return this.notificationLabelsService.createCustomLabel(userId, name, color);
  }

  async deactivateCustomLabel(userId: string, labelId: string) {
    return this.notificationLabelsService.deactivateCustomLabel(userId, labelId);
  }

  private async assignLabelsToState(messageUserStateId: string, userId: string, labelIds: string[], manager?: EntityManager) {
    const labelRepo = manager ? manager.getRepository(MessageLabelEntity) : this.messageLabelRepository;
    const assignmentRepo = manager ? manager.getRepository(MessageLabelAssignmentEntity) : this.messageLabelAssignmentRepository;
    const ids = Array.from(new Set((labelIds ?? []).filter(Boolean)));
    if (!ids.length) return;

    const labels = await labelRepo.find({
      where: ids.map((id) => ({ id })),
      select: ['id', 'ownerUserId', 'key', 'type'],
    });
    const allowedModules = await this.getAllowedNotificationModules(userId);
    const allowedModuleKeys = new Set(allowedModules.map((moduleItem) => moduleItem.key));
    const allowed = labels.filter((label) => {
      const ownerAllowed = !label.ownerUserId || label.ownerUserId === userId;
      if (!ownerAllowed) return false;
      if (label.type !== 'MODULE') return true;
      return allowedModuleKeys.has(label.key);
    });
    if (!allowed.length) return;

    const existing = await assignmentRepo.find({
      where: allowed.map((label) => ({
        messageUserStateId,
        userId,
        labelId: label.id,
      })),
      select: ['labelId'],
    });
    const existingIds = new Set(existing.map((item) => item.labelId));
    const toInsert = allowed.filter((label) => !existingIds.has(label.id));
    if (!toInsert.length) return;

    const records = toInsert.map((label) =>
      assignmentRepo.create({
        labelId: label.id,
        messageUserStateId,
        userId,
      }),
    );
    await assignmentRepo.save(records);
  }

  async updateCustomLabel(
    userId: string,
    labelId: string,
    input: { name?: string; color?: string; isVisible?: boolean },
  ) {
    return this.notificationLabelsService.updateCustomLabel(userId, labelId, input);
  }

  async forwardMessage(input: {
    senderUserId: string;
    parentMessageId: string;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    bodyHtml: string;
    bodyJson?: Record<string, unknown> | null;
    attachmentIds?: string[];
  }) {
    const parent = await this.messageRepository.findOne({ where: { id: input.parentMessageId } });
    if (!parent) throw new NotFoundException('MESSAGE_NOT_FOUND');
    this.ensureUserReplyableMessage(parent);
    await this.ensureCanOpenMessageOrThrow(input.senderUserId, parent.id);
    const { recipients: resolvedRecipients } = await this.messageRecipientsResolverService.resolveRecipientsByBucketsOrFail({
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      recipients: input.recipients,
    });
    await this.ensureCanAccessModule(input.senderUserId, parent.originModule);

    const parentSender = parent.senderUserId
      ? await this.userRepository.findOne({
          where: { id: parent.senderUserId },
          select: ['name', 'email'],
        })
      : null;
    const bodyHtml = this.messageContentService.normalizeHtmlBody(input.bodyHtml);
    const bodyText = this.messageContentService.toBodyText(bodyHtml);
    const bodyJson = {
      ...(input.bodyJson ?? {}),
      forwardedMessage: this.buildForwardedMessageMetadata(parent, parentSender),
    };
    const txResult = await this.dataSource.transaction(async (manager) => {
      const threadRepo = manager.getRepository(MessageThread);
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const thread = await threadRepo.save(
        threadRepo.create({
          subject: parent.subject.startsWith('Fwd:') ? parent.subject : `Fwd: ${parent.subject}`,
          createdByUserId: input.senderUserId,
          originModule: parent.originModule,
          sourceEntityType: parent.sourceEntityType,
          sourceEntityId: parent.sourceEntityId,
          lastMessageAt: new Date(),
        }),
      );

      const message = await messageRepo.save(
        messageRepo.create({
          threadId: thread.id,
          parentMessageId: parent.id,
          kind: 'USER_MESSAGE',
          originModule: parent.originModule,
          sourceEntityType: parent.sourceEntityType,
          sourceEntityId: parent.sourceEntityId,
          senderType: 'USER',
          senderUserId: input.senderUserId,
          createdByUserId: input.senderUserId,
          subject: thread.subject,
          bodyHtml,
          bodyText,
          bodyJson,
          status: 'SENT',
          isDraft: false,
          draftExpiresAt: null,
          sentAt: new Date(),
        }),
      );

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      await this.messageUserStatesService.createMessageUserStates(
        {
          message,
          senderUserId: input.senderUserId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.notificationAttachmentsService.linkAttachmentsToMessage(input.senderUserId, message.id, input.attachmentIds ?? [], undefined, manager);
      await this.mailStorageQuotaService.ensureAttachmentRefsForUsers({
        attachmentIds: input.attachmentIds ?? [],
        userIds: [input.senderUserId, ...resolvedRecipients.map((user) => user.id)],
        messageId: message.id,
        manager,
      });
      await this.messageAuditService.createAuditLog(
        {
          action: 'MESSAGE_FORWARDED',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            parentMessageId: parent.id,
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
          },
        },
        manager,
      );
      return { message, thread, recipients: savedRecipients };
    });
    await this.messageRealtimeEventsService.emitMessageCreatedToRecipients(input.senderUserId, txResult.message, txResult.recipients);
    return { id: txResult.message.id, threadId: txResult.thread.id, recipients: txResult.recipients.length };
  }

  async listDrafts(userId: string) {
    return this.messageRepository.find({
      where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async createDraft(input: {
    userId: string;
    recipients?: string;
    subject?: string;
    bodyHtml?: string;
    bodyJson?: Record<string, unknown>;
    originModule?: string;
  }) {
    const originModule = normalizeOriginModule(input.originModule, ORIGIN_MODULE.CORPORATE);
    await this.ensureCanAccessModule(input.userId, originModule);
    const now = new Date();
    const draftExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thread = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        subject: input.subject?.trim() || '(Sin asunto)',
        createdByUserId: input.userId,
        originModule,
        sourceEntityType: null,
        sourceEntityId: null,
        lastMessageAt: now,
      }),
    );
    const draft = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        parentMessageId: null,
        kind: 'USER_MESSAGE',
        originModule,
        sourceEntityType: null,
        sourceEntityId: null,
        senderType: 'USER',
        senderUserId: input.userId,
        createdByUserId: input.userId,
        subject: input.subject?.trim() || '(Sin asunto)',
        bodyHtml: this.messageContentService.normalizeHtmlBody(input.bodyHtml ?? ''),
        bodyText: this.messageContentService.toBodyText(input.bodyHtml ?? ''),
        bodyJson: { ...(input.bodyJson ?? {}), draftRecipients: input.recipients ?? '' },
        status: 'DRAFT',
        isDraft: true,
        draftExpiresAt,
        lastAutosavedAt: now,
        scheduledAt: null,
        sentAt: null,
      }),
    );
    await this.messageAuditService.createAuditLog({
      action: 'DRAFT_CREATED',
      actorUserId: input.userId,
      messageId: draft.id,
      threadId: draft.threadId,
    });
    return draft;
  }

  async updateDraft(input: {
    userId: string;
    draftId: string;
    recipients?: string;
    subject?: string;
    bodyHtml?: string;
    bodyJson?: Record<string, unknown>;
  }) {
    const draft = await this.messageRepository.findOne({
      where: { id: input.draftId, createdByUserId: input.userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    if (draft.draftExpiresAt && draft.draftExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('DRAFT_EXPIRED');
    }
    if (typeof input.subject === 'string') draft.subject = input.subject.trim() || '(Sin asunto)';
    if (typeof input.bodyHtml === 'string') {
      draft.bodyHtml = this.messageContentService.normalizeHtmlBody(input.bodyHtml);
      draft.bodyText = this.messageContentService.toBodyText(input.bodyHtml);
    }
    if (typeof input.recipients === 'string') {
      draft.bodyJson = {
        ...(draft.bodyJson ?? {}),
        draftRecipients: input.recipients,
      };
    }
    if (input.bodyJson && typeof input.bodyJson === 'object') {
      draft.bodyJson = {
        ...(draft.bodyJson ?? {}),
        ...input.bodyJson,
      };
    }
    const now = new Date();
    draft.updatedAt = now;
    draft.draftExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    draft.lastAutosavedAt = now;
    const saved = await this.messageRepository.save(draft);
    await this.messageAuditService.createAuditLog({
      action: 'DRAFT_UPDATED',
      actorUserId: input.userId,
      messageId: saved.id,
      threadId: saved.threadId,
    });
    return { draft: saved, recipients: input.recipients ?? null };
  }

  async deleteDraft(userId: string, draftId: string) {
    const draft = await this.messageRepository.findOne({
      where: { id: draftId, createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    draft.isDraft = false;
    draft.draftExpiresAt = null;
    const saved = await this.messageRepository.save(draft);
    await this.messageAuditService.createAuditLog({
      action: 'DRAFT_DISCARDED',
      actorUserId: userId,
      messageId: saved.id,
      threadId: saved.threadId,
    });
    return saved;
  }

  async sendDraft(userId: string, draftId: string, recipientsRaw?: string, attachmentIds: string[] = []) {
    const draft = await this.messageRepository.findOne({
      where: { id: draftId, createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    if (draft.draftExpiresAt && draft.draftExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('DRAFT_EXPIRED');
    }
    const draftRecipients = String((draft.bodyJson as Record<string, unknown> | null)?.draftRecipients ?? '').trim();
    const { recipients: resolvedRecipients } = await this.messageRecipientsResolverService.resolveRecipientsByBucketsOrFail({
      recipients: (recipientsRaw ?? '').trim() || draftRecipients,
    });
    const txResult = await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      draft.isDraft = false;
      draft.status = 'SENT';
      draft.sentAt = new Date();
      draft.draftExpiresAt = null;
      const sent = await messageRepo.save(draft);

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: sent.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      await this.messageUserStatesService.createMessageUserStates(
        {
          message: sent,
          senderUserId: userId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.notificationAttachmentsService.linkAttachmentsToMessage(userId, sent.id, attachmentIds, draftId, manager);
      await this.mailStorageQuotaService.ensureAttachmentRefsForUsers({
        attachmentIds,
        userIds: [userId, ...resolvedRecipients.map((user) => user.id)],
        messageId: sent.id,
        manager,
      });
      await this.messageAuditService.createAuditLog(
        {
          action: 'DRAFT_SENT',
          actorUserId: userId,
          messageId: sent.id,
          threadId: sent.threadId,
          metadata: { recipients: resolvedRecipients.map((user) => user.email) },
        },
        manager,
      );
      return { sent, recipients: savedRecipients };
    });
    await this.messageRealtimeEventsService.emitMessageCreatedToRecipients(userId, txResult.sent, txResult.recipients);
    return { id: txResult.sent.id, recipients: txResult.recipients.length };
  }

  async listMessages(
    userId: string,
    query: {
      view?: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
      originModule?: string;
      q?: string;
      page?: number;
      limit?: number;
      read?: boolean;
      hasAttachments?: boolean;
      labelId?: string;
    },
  ) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    if (query.originModule) await this.ensureCanAccessModule(userId, query.originModule);
    return this.notificationQueriesService.listMessages(userId, query);
  }

  async countMessages(
    userId: string,
    query: {
      view?: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
      originModule?: string;
      read?: boolean;
      hasAttachments?: boolean;
      labelId?: string;
    },
  ) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    if (query.originModule) await this.ensureCanAccessModule(userId, query.originModule);
    return this.notificationQueriesService.countMessages(userId, query);
  }

  async countSidebarMessages(userId: string, labelIds: string[] = []) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    return this.notificationQueriesService.countSidebarMessages(userId, labelIds);
  }

  async hasUnreadMessages(userId: string) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    const result = await this.notificationQueriesService.countMessages(userId, {
      view: 'inbox',
      read: false,
    });
    return { hasUnread: (result.total ?? 0) > 0 };
  }

  async listMessageActions(userId: string, query: { threadId?: string; messageId?: string }) {
    return this.messageActionsService.listActionsForUser(userId, query);
  }

  async executeMessageAction(input: { userId: string; actionId: string; comment?: string }) {
    return this.messageActionsService.executeAction({
      userId: input.userId,
      actionId: input.actionId,
      comment: input.comment,
    });
  }

  async getMessageDetail(userId: string, id: string) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    const ownMessage = await this.messageRepository.findOne({ where: { id, senderUserId: userId } });
    if (ownMessage) {
      await this.ensureCanAccessModule(userId, ownMessage.originModule);
      const sender = ownMessage.senderUserId
        ? await this.userRepository.findOne({
            where: { id: ownMessage.senderUserId },
            select: ['id', 'name', 'email'],
          })
        : null;
      const recipients = await this.messageUserStateRepository.find({ where: { messageId: ownMessage.id } });
      const attachments = await this.messageAttachmentRepository.find({
        where: { messageId: ownMessage.id },
      });
      const senderState = await this.messageUserStateRepository.findOne({
        where: { messageId: ownMessage.id, userId, relationType: 'SENDER' },
      });
      const labelAssignments = senderState
        ? await this.messageLabelAssignmentRepository.find({
            where: { messageUserStateId: senderState.id, userId },
          })
        : [];
      const labels = labelAssignments.length
        ? await this.messageLabelRepository.find({
            where: labelAssignments.map((assignment) => ({ id: assignment.labelId })),
          })
        : [];
      const thread = await this.buildThreadItems(ownMessage, userId);
      return {
        recipient: senderState,
        message: ownMessage,
        sender,
        recipients,
        attachments,
        labels,
        thread,
        permissions: {
          canOpen: true,
          canReply: ownMessage.senderType !== 'SYSTEM' && ownMessage.kind === 'USER_MESSAGE',
          canForward: ownMessage.senderType !== 'SYSTEM' && ownMessage.kind === 'USER_MESSAGE',
          canArchive: true,
          canDelete: true,
          canDownloadAttachments: true,
          canViewModule: true,
        },
      };
    }

    const recipient =
      (await this.messageUserStateRepository.findOne({ where: { id, userId } })) ??
      (await this.messageUserStateRepository.findOne({ where: { messageId: id, userId } }));
    if (!recipient) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    if (recipient.permanentlyHiddenAt) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }

    const message = await this.messageRepository.findOne({ where: { id: recipient.messageId } });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(userId, message.originModule);
    const sender = message.senderUserId
      ? await this.userRepository.findOne({
          where: { id: message.senderUserId },
          select: ['id', 'name', 'email'],
        })
      : null;
    const recipients = await this.messageUserStateRepository.find({ where: { messageId: message.id } });
    const attachments = await this.messageAttachmentRepository.find({
      where: { messageId: message.id },
    });
    const labelAssignments = await this.messageLabelAssignmentRepository.find({
      where: { messageUserStateId: recipient.id, userId },
    });
    const labels = labelAssignments.length
      ? await this.messageLabelRepository.find({
          where: labelAssignments.map((assignment) => ({ id: assignment.labelId })),
        })
      : [];

    if (!recipient.readAt) {
      recipient.readAt = new Date();
      recipient.openedAt = new Date();
      await this.messageUserStateRepository.save(recipient);
      await this.messageAuditService.createAuditLog({
        action: 'MESSAGE_READ',
        actorUserId: userId,
        messageId: message.id,
        threadId: message.threadId,
      });
    }

    const thread = await this.buildThreadItems(message, userId);
    const canViewModule = await this.accessControlPort.canViewModuleMessages(
      userId,
      message.originModule,
      NOTIFICATION_MODULE_PERMISSIONS[message.originModule] ?? ['page.notifications.view'],
    );
    const canDownloadAttachment = attachments.length
      ? await this.accessControlPort.canDownloadAttachment(
          userId,
          attachments[0].id,
          message.originModule,
          NOTIFICATION_MODULE_PERMISSIONS[message.originModule] ?? ['page.notifications.view'],
        )
      : true;

    return {
      recipient,
      message,
      sender,
      recipients,
      attachments,
      labels,
      thread,
        permissions: {
          canOpen: true,
          canReply: message.senderType !== 'SYSTEM' && message.kind === 'USER_MESSAGE',
          canForward: message.senderType !== 'SYSTEM' && message.kind === 'USER_MESSAGE',
          canArchive: true,
          canDelete: true,
        canDownloadAttachments: canDownloadAttachment,
        canViewModule,
      },
    };
  }

  async markMessageAsRead(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    if (!recipient.readAt) {
      this.messageStateService.markRead(recipient);
      await this.messageUserStateRepository.save(recipient);
      await this.messageAuditService.createAuditLog({
        action: 'MESSAGE_READ',
        actorUserId: userId,
        messageId: recipient.messageId,
        threadId: recipient.threadId,
      });
    }
    return recipient;
  }

  async markMessageAsUnread(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    this.messageStateService.markUnread(recipient);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_UNREAD',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async toggleStarMessage(userId: string, recipientId: string, value: boolean) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    recipient.starredAt = value ? new Date() : null;
    await this.messageAuditService.createAuditLog({
      action: value ? 'MESSAGE_STARRED' : 'MESSAGE_UNSTARRED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async deleteMessage(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    this.messageStateService.moveToTrash(recipient);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_DELETED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async permanentlyDeleteMessage(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    if (!recipient.deletedAt) throw new BadRequestException('MESSAGE_NOT_IN_TRASH');
    recipient.permanentlyHiddenAt = new Date();
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_DELETED_PERMANENTLY',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async restoreMessage(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    this.messageStateService.restoreFromTrash(recipient);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_RESTORED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async archiveMessage(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    this.messageStateService.archive(recipient);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_ARCHIVED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async unarchiveMessage(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    this.messageStateService.unarchive(recipient);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_UNARCHIVED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async snoozeMessage(userId: string, recipientId: string, snoozedUntilIso: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    const snoozedUntil = new Date(snoozedUntilIso);
    if (Number.isNaN(snoozedUntil.getTime()) || snoozedUntil.getTime() <= Date.now()) {
      throw new BadRequestException('SNOOZE_DATE_INVALID');
    }
    this.messageStateService.snooze(recipient, snoozedUntil);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_SNOOZED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
      metadata: { snoozedUntil: snoozedUntil.toISOString() },
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async unsnoozeMessage(userId: string, recipientId: string) {
    const recipient = await this.messageUserStateAccessService.findMessageStateOrThrow(userId, recipientId);
    this.messageStateService.unsnooze(recipient);
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_UNSNOOZED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async releaseDueSnoozedMessagesForUser(userId: string) {
    await this.messageUserStateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({ snoozedUntil: null, snoozedAt: null, isInInbox: true })
      .where('user_id = :userId', { userId })
      .andWhere('snoozed_until IS NOT NULL')
      .andWhere('snoozed_until <= now()')
      .execute();
  }

  async expireTrashForUser(userId: string) {
    await this.messageUserStateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({ permanentlyHiddenAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('deleted_at IS NOT NULL')
      .andWhere('trash_expires_at IS NOT NULL')
      .andWhere('trash_expires_at <= now()')
      .andWhere('permanently_hidden_at IS NULL')
      .execute();
  }

  async bulkUpdateMessages(
    userId: string,
    input: {
      messageRecipientIds?: string[];
      messageStateIds?: string[];
      action:
        | 'MARK_AS_READ'
        | 'MARK_AS_UNREAD'
        | 'DELETE'
        | 'STAR'
        | 'UNSTAR'
        | 'RESTORE'
        | 'ARCHIVE'
        | 'UNARCHIVE'
        | 'SNOOZE'
        | 'UNSNOOZE'
        | 'MOVE_TO_TRASH'
        | 'ASSIGN_LABEL'
        | 'REMOVE_LABEL';
      snoozedUntil?: string;
      labelId?: string;
    },
  ) {
    if (input.action === 'ASSIGN_LABEL' || input.action === 'REMOVE_LABEL') {
      if (!input.labelId) {
        throw new BadRequestException('LABEL_ID_REQUIRED');
      }
    }

    let parsedSnoozeDate: Date | null = null;
    if (input.action === 'SNOOZE') {
      if (!input.snoozedUntil) {
        throw new BadRequestException('SNOOZE_DATE_REQUIRED');
      }
      parsedSnoozeDate = new Date(input.snoozedUntil);
      if (Number.isNaN(parsedSnoozeDate.getTime()) || parsedSnoozeDate.getTime() <= Date.now()) {
        throw new BadRequestException('SNOOZE_DATE_INVALID');
      }
    }

    const rawIds = [...(input.messageRecipientIds ?? []), ...(input.messageStateIds ?? [])];
    const ids = Array.from(new Set(rawIds.filter(Boolean)));
    if (!ids.length) return { updated: 0 };
    const states = await this.messageUserStateRepository.find({ where: ids.map((id) => ({ id, userId })) });
    const own = states.filter((recipient) => recipient.userId === userId);
    const now = new Date();
    own.forEach((recipient) => {
      if (input.action === 'MARK_AS_READ') recipient.readAt = recipient.readAt ?? now;
      if (input.action === 'MARK_AS_UNREAD') recipient.readAt = null;
      if (input.action === 'DELETE' || input.action === 'MOVE_TO_TRASH') {
        recipient.deletedAt = now;
        recipient.trashExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        recipient.isArchived = false;
        recipient.isInInbox = false;
      }
      if (input.action === 'RESTORE') {
        recipient.deletedAt = null;
        recipient.trashExpiresAt = null;
        recipient.permanentlyHiddenAt = null;
        if (recipient.relationType !== 'SENDER') recipient.isInInbox = true;
      }
      if (input.action === 'STAR') recipient.starredAt = now;
      if (input.action === 'UNSTAR') recipient.starredAt = null;
      if (input.action === 'ARCHIVE') {
        recipient.isArchived = true;
        recipient.isInInbox = false;
      }
      if (input.action === 'UNARCHIVE') {
        recipient.isArchived = false;
        if (recipient.relationType !== 'SENDER') recipient.isInInbox = true;
      }
      if (input.action === 'UNSNOOZE') {
        recipient.snoozedUntil = null;
        recipient.snoozedAt = null;
      }
      if (input.action === 'SNOOZE' && parsedSnoozeDate) {
        recipient.snoozedUntil = parsedSnoozeDate;
        recipient.snoozedAt = now;
        recipient.isInInbox = false;
      }
    });
    await this.messageUserStateRepository.save(own);
    if (!own.length) {
      return { updated: 0 };
    }
    if (input.action === 'ASSIGN_LABEL' && input.labelId) {
      await Promise.all(own.map((state) => this.notificationLabelsService.assignLabelsToState(state.id, userId, [input.labelId!])));
    }
    if (input.action === 'REMOVE_LABEL' && input.labelId) {
      await this.messageLabelAssignmentRepository
        .createQueryBuilder()
        .delete()
        .where('user_id = :userId', { userId })
        .andWhere('label_id = :labelId', { labelId: input.labelId })
        .andWhere('message_user_state_id IN (:...ids)', { ids: own.map((state) => state.id) })
        .execute();
    }
    await this.messageAuditService.createAuditLog({
      action: 'MESSAGE_BULK_ACTION',
      actorUserId: userId,
      metadata: {
        action: input.action,
        updated: own.length,
        messageStateIds: own.map((state) => state.id),
        messageIds: own.map((state) => state.messageId),
        labelId: input.labelId ?? null,
        snoozedUntil: input.snoozedUntil ?? null,
      },
    });
    return { updated: own.length };
  }

  async listSearchHistory(userId: string) {
    return this.notificationLabelsService.listSearchHistory(userId);
  }

  async saveSearchHistory(userId: string, query: string) {
    return this.notificationLabelsService.saveSearchHistory(userId, query);
  }

  async deleteSearchHistory(userId: string, id: string) {
    return this.notificationLabelsService.deleteSearchHistory(userId, id);
  }

  async assignLabelToMessage(userId: string, messageId: string, labelId: string) {
    const result = await this.notificationLabelsService.assignLabelToMessage(userId, messageId, labelId);
    await this.messageAuditService.createAuditLog({ action: 'LABEL_ASSIGNED', actorUserId: userId, messageId: result.state.messageId, threadId: result.state.threadId, metadata: { labelId } });
    return { assigned: true };
  }

  async removeLabelFromMessage(userId: string, messageId: string, labelId: string) {
    const result = await this.notificationLabelsService.removeLabelFromMessage(userId, messageId, labelId);
    await this.messageAuditService.createAuditLog({ action: 'LABEL_REMOVED', actorUserId: userId, messageId: result.state.messageId, threadId: result.state.threadId, metadata: { labelId } });
    return { removed: true };
  }

  async uploadAttachment(input: {
    userId: string;
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
    messageId?: string;
    draftId?: string;
    kind?: 'file' | 'image';
  }) {
    const saved = await this.notificationAttachmentsService.uploadAttachment({
      ...input,
      modulePermissions: NOTIFICATION_MODULE_PERMISSIONS,
    });
    await this.messageAuditService.createAuditLog({
      action: 'ATTACHMENT_UPLOADED',
      actorUserId: input.userId,
      messageId: input.messageId ?? input.draftId ?? null,
      metadata: {
        attachmentId: saved.id,
        originalName: saved.originalName,
        sizeBytes: saved.sizeBytes,
        attachmentKind: saved.attachmentKind,
      },
    });

    return {
      id: saved.id,
      name: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: Number(saved.sizeBytes),
      attachmentKind: saved.attachmentKind,
      messageId: saved.messageId,
      draftId: saved.draftId,
      createdAt: saved.createdAt,
    };
  }

  async downloadAttachment(userId: string, attachmentId: string) {
    const file = await this.notificationAttachmentsService.downloadAttachment(
      userId,
      attachmentId,
      NOTIFICATION_MODULE_PERMISSIONS,
    );
    return {
      fileName: file.attachment.originalName,
      mimeType: file.attachment.mimeType,
      buffer: file.buffer,
    };
  }

  async listMyFiles(
    userId: string,
    query?: { type?: 'all' | 'image' | 'file'; page?: number; limit?: number; q?: string },
  ) {
    return this.notificationAttachmentsService.listUserFiles(userId, query);
  }

  async deleteAttachment(userId: string, attachmentId: string) {
    const attachment = await this.notificationAttachmentsService.deleteAttachment(
      userId,
      attachmentId,
      NOTIFICATION_MODULE_PERMISSIONS,
    );
    await this.messageAuditService.createAuditLog({
      action: 'ATTACHMENT_REMOVED',
      actorUserId: userId,
      messageId: attachment.messageId ?? attachment.draftId ?? null,
      metadata: { attachmentId },
    });

    return { deleted: true };
  }

  async deleteMyFile(userId: string, attachmentId: string) {
    const result = await this.notificationAttachmentsService.deleteAttachmentForUser(
      userId,
      attachmentId,
      NOTIFICATION_MODULE_PERMISSIONS,
    );
    await this.messageAuditService.createAuditLog({
      action: 'ATTACHMENT_REMOVED',
      actorUserId: userId,
      messageId: result.attachment.messageId ?? result.attachment.draftId ?? null,
      metadata: {
        attachmentId,
        source: 'MAIL_FILES',
        fullyReleased: result.fullyReleased,
      },
    });
    return { deleted: true };
  }

  async bulkDeleteMyFiles(userId: string, attachmentIds: string[]) {
    const result = await this.notificationAttachmentsService.bulkDeleteAttachmentsForUser(
      userId,
      attachmentIds,
      NOTIFICATION_MODULE_PERMISSIONS,
    );
    await this.messageAuditService.createAuditLog({
      action: 'ATTACHMENT_REMOVED',
      actorUserId: userId,
      metadata: {
        source: 'MAIL_FILES_BULK',
        deleted: result.deleted,
        attachmentIds: Array.from(new Set((attachmentIds ?? []).filter(Boolean))),
      },
    });
    return result;
  }

  async getMyStorageSummary(userId: string) {
    return this.mailStorageQuotaService.getStorageSummary(userId);
  }

  async updateMyStorageQuota(userId: string, mailStorageQuotaGb: number) {
    await this.assertSuperAdminOrFail(userId);
    return this.mailStorageQuotaService.setQuotaGb(userId, mailStorageQuotaGb, userId);
  }

  async getUserStorageSummary(requesterUserId: string, targetUserId: string) {
    await this.assertSuperAdminOrFail(requesterUserId);
    const target = await this.userRepository.findOne({
      where: { id: targetUserId },
      select: ['id', 'deleted'],
    });
    if (!target || target.deleted) throw new NotFoundException('USER_NOT_FOUND');
    return this.mailStorageQuotaService.getStorageSummary(targetUserId);
  }

  async updateUserStorageQuota(requesterUserId: string, targetUserId: string, mailStorageQuotaGb: number) {
    await this.assertSuperAdminOrFail(requesterUserId);
    const target = await this.userRepository.findOne({
      where: { id: targetUserId },
      select: ['id', 'deleted'],
    });
    if (!target || target.deleted) throw new NotFoundException('USER_NOT_FOUND');
    return this.mailStorageQuotaService.setQuotaGb(targetUserId, mailStorageQuotaGb, requesterUserId);
  }

  async createNotificationForUsers(input: {
    recipientUserIds: string[];
    type: string;
    category: string;
    title: string;
    message: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
    actionUrl?: string | null;
    actionLabel?: string | null;
    metadata?: Record<string, unknown> | null;
    isSystem?: boolean;
    showAsToast?: boolean;
    sourceModule?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
  }): Promise<Array<{ userId: string; recipientId: string }>> {
    return this.systemNotificationService.createNotificationForUsers(input);
  }
}









