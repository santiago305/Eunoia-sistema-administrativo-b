import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageLabelAssignmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-label-assignment.entity';
import { MessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';

@Injectable()
export class MessageRealtimeEventsService {
  private readonly logger = new Logger(MessageRealtimeEventsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageLabelAssignmentEntity)
    private readonly messageLabelAssignmentRepository: Repository<MessageLabelAssignmentEntity>,
    @InjectRepository(MessageLabelEntity)
    private readonly messageLabelRepository: Repository<MessageLabelEntity>,
    private readonly realtimeService: NotificationRealtimeService,
  ) {}

  private buildMessageRealtimePayload(params: {
    message: MessageEntity,
    state: MessageUserStateEntity,
    recipient: MessageRecipientEntity,
    sender: { id: string; name: string; email: string } | null,
    labels: MessageLabelEntity[],
  }) {
    const { message, state, recipient, sender, labels } = params;
    const snoozedUntilIso = state.snoozedUntil ? state.snoozedUntil.toISOString() : null;
    const recipientType =
      state.relationType === 'CC' ? 'CC' : state.relationType === 'BCC' ? 'BCC' : 'TO';

    return {
      recipientId: state.id,
      messageRecipientId: recipient.id,
      hasUnreadMail: true,
      countsDelta: {
        inbox: 1,
      },
      recipient: {
        id: state.id,
        messageId: state.messageId,
        recipientUserId: state.userId,
        recipientEmail: state.recipientEmail ?? recipient.recipientEmail,
        recipientType,
        readAt: state.readAt,
        starredAt: state.starredAt,
        deletedAt: state.deletedAt,
        deliveredAt: state.deliveredAt ?? recipient.deliveredAt,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
        isArchived: state.isArchived,
        isInInbox: state.isInInbox,
        snoozedUntil: snoozedUntilIso,
      },
      message: {
        id: message.id,
        threadId: message.threadId,
        parentMessageId: message.parentMessageId,
        kind: message.kind,
        originModule: message.originModule,
        senderType: message.senderType,
        senderUserId: message.senderUserId,
        createdByUserId: message.createdByUserId,
        subject: message.subject,
        bodyHtml: message.bodyHtml,
        bodyText: message.bodyText,
        bodyJson: message.bodyJson ?? null,
        sourceEntityType: message.sourceEntityType,
        sourceEntityId: message.sourceEntityId,
        status: message.status,
        isDraft: message.isDraft,
        sentAt: message.sentAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        preview: message.bodyText.slice(0, 140),
      },
      sender,
      labels: labels.map((label) => ({
        id: label.id,
        ownerUserId: label.ownerUserId,
        key: label.key,
        name: label.name,
        type: label.type,
        color: label.color,
        icon: label.icon,
        isVisible: label.isVisible,
        sortOrder: label.sortOrder,
      })),
    };
  }

  async emitMessageCreatedToRecipients(
    senderUserId: string,
    message: MessageEntity,
    recipients: MessageRecipientEntity[],
  ) {
    const [sender, states] = await Promise.all([
      this.userRepository.findOne({
        where: { id: senderUserId },
        select: ['id', 'name', 'email'],
      }),
      this.messageUserStateRepository.find({ where: { messageId: message.id } }),
    ]);
    const senderPayload = sender
      ? {
          id: sender.id,
          name: sender.name?.trim() || 'Usuario',
          email: sender.email,
        }
      : null;
    const stateByKey = new Map<string, MessageUserStateEntity>();
    states.forEach((state) => {
      stateByKey.set(`${state.messageId}:${state.userId}`, state);
    });
    const stateIds = states.map((state) => state.id);
    const assignments = stateIds.length
      ? await this.messageLabelAssignmentRepository.find({
          where: stateIds.map((stateId) => ({ messageUserStateId: stateId })),
        })
      : [];
    const labelIds = Array.from(new Set(assignments.map((assignment) => assignment.labelId)));
    const labels = labelIds.length
      ? await this.messageLabelRepository.find({ where: labelIds.map((id) => ({ id })) })
      : [];
    const labelById = new Map(labels.map((label) => [label.id, label]));
    const labelsByStateId = new Map<string, MessageLabelEntity[]>();
    assignments.forEach((assignment) => {
      const current = labelsByStateId.get(assignment.messageUserStateId) ?? [];
      const label = labelById.get(assignment.labelId);
      if (label) current.push(label);
      labelsByStateId.set(assignment.messageUserStateId, current);
    });

    for (const recipient of recipients) {
      const state = stateByKey.get(`${message.id}:${recipient.recipientUserId}`);
      if (!state) continue;

      const payload = this.buildMessageRealtimePayload({
        message,
        state,
        recipient,
        sender: senderPayload,
        labels: labelsByStateId.get(state.id) ?? [],
      });
      this.realtimeService.emitToUser(recipient.recipientUserId, 'message.created', payload);
    }

    this.logger.debug(
      `mail_realtime_emit event=message.created messageId=${message.id} recipients=${recipients.length} originModule=${message.originModule}`,
    );
  }

  emitScheduledMessageReleasedToSender(senderUserId: string, message: MessageEntity) {
    this.realtimeService.emitToUser(senderUserId, 'message.created', {
      hasUnreadMail: false,
      countsDelta: {
        scheduled: -1,
        sent: 1,
      },
      message: {
        id: message.id,
        threadId: message.threadId,
        parentMessageId: message.parentMessageId,
        kind: message.kind,
        originModule: message.originModule,
        senderType: message.senderType,
        senderUserId: message.senderUserId,
        createdByUserId: message.createdByUserId,
        subject: message.subject,
        bodyHtml: message.bodyHtml,
        bodyText: message.bodyText,
        bodyJson: message.bodyJson ?? null,
        sourceEntityType: message.sourceEntityType,
        sourceEntityId: message.sourceEntityId,
        status: message.status,
        isDraft: message.isDraft,
        scheduledAt: null,
        sentAt: message.sentAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        preview: message.bodyText.slice(0, 140),
      },
    });

    this.logger.debug(
      `mail_realtime_emit event=message.created senderId=${senderUserId} messageId=${message.id} scheduledReleased=true`,
    );
  }
}
