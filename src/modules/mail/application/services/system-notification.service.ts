import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageThread } from '../../adapters/out/persistence/typeorm/entities/message-thread.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { NotificationModuleLabelConfigEntity } from '../../adapters/out/persistence/typeorm/entities/notification-module-label-config.entity';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';
import { NotificationPayloadMapperService } from './notification-payload-mapper.service';
import { MessageAuditService } from './message-audit.service';
import { NotificationLabelsService } from './notification-labels.service';
import { ORIGIN_MODULE } from '../../domain/enums/origin-module.enum';
import { normalizeOriginModule } from '../../domain/utils/normalize-origin-module';

@Injectable()
export class SystemNotificationService {
  private readonly logger = new Logger(SystemNotificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageThread)
    private readonly messageThreadRepository: Repository<MessageThread>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(NotificationModuleLabelConfigEntity)
    private readonly notificationModuleLabelConfigRepository: Repository<NotificationModuleLabelConfigEntity>,
    private readonly realtimeService: NotificationRealtimeService,
    private readonly notificationPayloadMapperService: NotificationPayloadMapperService,
    private readonly messageAuditService: MessageAuditService,
    private readonly notificationLabelsService: NotificationLabelsService,
  ) {}

  private toUuidOrNull(value?: string | null) {
    if (!value) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
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
    const recipientUserIds = Array.from(new Set(input.recipientUserIds.filter(Boolean)));
    if (!recipientUserIds.length) return [];

    const users = await this.userRepository.findBy({ id: In(recipientUserIds) });
    if (!users.length) return [];

    const originModule = normalizeOriginModule(input.sourceModule, ORIGIN_MODULE.SYSTEM);
    const subject = input.title?.trim() || 'Notificacion del sistema';
    const bodyText = input.message?.trim() || '';
    const bodyHtml = `<p>${bodyText}</p>`;
    const sourceEntityType = input.sourceEntityType?.trim() || null;
    const sourceEntityId = this.toUuidOrNull(input.sourceEntityId ?? null);
    const canGroupByEntity = Boolean(sourceEntityType && sourceEntityId);

    const existingThread = canGroupByEntity
      ? await this.messageThreadRepository.findOne({
          where: {
            originModule,
            sourceEntityType,
            sourceEntityId,
          },
        })
      : null;
    const previousMessage = existingThread
      ? await this.messageRepository.findOne({
          where: { threadId: existingThread.id },
          order: { sentAt: 'DESC', createdAt: 'DESC' },
        })
      : null;

    const thread = existingThread
      ? await this.messageThreadRepository.save({
          ...existingThread,
          subject,
          lastMessageAt: new Date(),
        })
      : await this.messageThreadRepository.save(this.messageThreadRepository.create({
        subject,
        createdByUserId: null,
        originModule,
        sourceEntityType,
        sourceEntityId,
        lastMessageAt: new Date(),
      }));

    const systemMessage = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        parentMessageId: previousMessage?.id ?? null,
        kind: 'SYSTEM_NOTIFICATION',
        originModule,
        sourceEntityType,
        sourceEntityId,
        senderType: 'SYSTEM',
        senderUserId: null,
        createdByUserId: null,
        subject,
        bodyHtml,
        bodyText,
        bodyJson: input.metadata ?? {},
        status: 'SENT',
        isDraft: false,
        draftExpiresAt: null,
        lastAutosavedAt: null,
        scheduledAt: null,
        sentAt: new Date(),
      }),
    );

    const savedStates = await this.messageUserStateRepository.save(
      users.map((user) =>
        this.messageUserStateRepository.create({
          messageId: systemMessage.id,
          threadId: thread.id,
          userId: user.id,
          relationType: 'SYSTEM_RECIPIENT',
          recipientEmail: user.email,
          isInInbox: true,
          isInSent: false,
          isArchived: false,
          isMuted: false,
          readAt: null,
          starredAt: null,
          snoozedUntil: null,
          snoozedAt: null,
          deletedAt: null,
          trashExpiresAt: null,
          permanentlyHiddenAt: null,
          deliveredAt: new Date(),
          openedAt: null,
        }),
      ),
    );

    const moduleLabelConfig = await this.notificationModuleLabelConfigRepository.findOne({
      where: { moduleKey: originModule },
      select: ['labelId'],
    });
    if (moduleLabelConfig?.labelId) {
      await Promise.all(
        savedStates.map((state) =>
          this.notificationLabelsService.assignLabelsToState(state.id, state.userId, [moduleLabelConfig.labelId!]),
        ),
      );
    }

    const createdRecipients: Array<{ userId: string; recipientId: string }> = savedStates.map((state) => ({
      userId: state.userId,
      recipientId: state.id,
    }));

    for (const state of savedStates) {
      const payload = this.notificationPayloadMapperService.toNotificationResponse(state, systemMessage);
      payload.notification = {
        ...payload.notification,
        type: input.type,
        category: input.category,
        priority: input.priority ?? 'NORMAL',
        actionUrl: input.actionUrl ?? null,
        actionLabel: input.actionLabel ?? null,
        metadata: { ...(payload.notification.metadata ?? {}), ...(input.metadata ?? {}) },
        showAsToast: input.showAsToast ?? true,
      };
      this.realtimeService.emitToUser(state.userId, 'notification.created', payload);
    }

    await this.messageAuditService.createAuditLog({
      action: 'SYSTEM_NOTIFICATION_CREATED',
      actorUserId: null,
      messageId: systemMessage.id,
      threadId: systemMessage.threadId,
      metadata: {
        type: input.type,
        category: input.category,
        recipients: users.map((user) => user.email),
      },
    });

    this.logger.debug(
      `mail_system_notification_created messageId=${systemMessage.id} originModule=${originModule} recipients=${users.length} type=${input.type}`,
    );

    return createdRecipients;
  }
}
