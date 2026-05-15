import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';

@Injectable()
export class MessageRealtimeEventsService {
  private readonly logger = new Logger(MessageRealtimeEventsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly realtimeService: NotificationRealtimeService,
  ) {}

  private buildMessageRealtimePayload(
    message: MessageEntity,
    recipient: MessageRecipientEntity,
    senderName: string,
  ) {
    return {
      recipientId: recipient.id,
      messageRecipientId: recipient.id,
      message: {
        id: message.id,
        threadId: message.threadId,
        subject: message.subject,
        preview: message.bodyText.slice(0, 140),
        originModule: message.originModule,
        senderName,
        senderType: message.senderType,
        sentAt: message.sentAt,
      },
    };
  }

  async emitMessageCreatedToRecipients(
    senderUserId: string,
    message: MessageEntity,
    recipients: MessageRecipientEntity[],
  ) {
    const sender =
      (await this.userRepository.findOne({
        where: { id: senderUserId },
        select: ['name'],
      })) ?? null;
    const senderName = sender?.name?.trim() || 'Usuario';

    recipients.forEach((recipient) => {
      const payload = this.buildMessageRealtimePayload(message, recipient, senderName);
      this.realtimeService.emitToUser(recipient.recipientUserId, 'message.created', payload);
    });

    this.logger.debug(
      `mail_realtime_emit event=message.created messageId=${message.id} recipients=${recipients.length} originModule=${message.originModule}`,
    );
  }
}
