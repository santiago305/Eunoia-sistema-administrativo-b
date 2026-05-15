import { Injectable } from '@nestjs/common';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

@Injectable()
export class NotificationPayloadMapperService {
  toNotificationResponse(state: MessageUserStateEntity, message: MessageEntity) {
    const metadata = (message.bodyJson ?? {}) as Record<string, unknown>;
    const sourceModule = message.originModule ?? null;
    return {
      recipientId: state.id,
      status: state.isArchived
        ? 'ARCHIVED'
        : state.deletedAt
          ? 'DELETED'
          : state.readAt
            ? 'READ'
            : state.openedAt
              ? 'SEEN'
              : 'UNREAD',
      seenAt: state.openedAt,
      readAt: state.readAt,
      deliveredAt: state.deliveredAt,
      archivedAt: state.isArchived ? state.updatedAt : null,
      dismissedAt: null,
      createdAt: state.createdAt,
      notification: {
        id: message.id,
        type: String(metadata?.type ?? message.kind ?? 'SYSTEM_MESSAGE'),
        category: String(metadata?.category ?? (sourceModule === 'purchases' ? 'PURCHASES' : 'SYSTEM')),
        title: message.subject,
        message: message.bodyText,
        priority: String(metadata?.priority ?? 'NORMAL'),
        sourceModule,
        sourceEntityType: message.sourceEntityType,
        sourceEntityId: message.sourceEntityId,
        actionUrl: typeof metadata?.actionUrl === 'string' ? metadata.actionUrl : null,
        actionLabel: typeof metadata?.actionLabel === 'string' ? metadata.actionLabel : null,
        metadata,
        isSystem: message.senderType === 'SYSTEM',
        showAsToast: metadata?.showAsToast !== false,
        createdAt: message.createdAt,
      },
    };
  }
}
