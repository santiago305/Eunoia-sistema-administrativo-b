import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

@Injectable()
export class MessageUserStatesService {
  constructor(
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
  ) {}

  async createMessageUserStates(
    input: {
      message: MessageEntity;
      senderUserId: string;
      recipients: Array<{ id: string; email: string; relationType: 'TO' | 'CC' | 'BCC' }>;
    },
    manager?: EntityManager,
  ) {
    const stateRepo = manager ? manager.getRepository(MessageUserStateEntity) : this.messageUserStateRepository;
    const now = new Date();
    const states: MessageUserStateEntity[] = [];

    states.push(
      stateRepo.create({
        messageId: input.message.id,
        threadId: input.message.threadId,
        userId: input.senderUserId,
        relationType: 'SENDER',
        recipientEmail: null,
        isInInbox: false,
        isInSent: true,
        isArchived: false,
        isMuted: false,
        readAt: now,
        starredAt: null,
        snoozedUntil: null,
        snoozedAt: null,
        deletedAt: null,
        trashExpiresAt: null,
        permanentlyHiddenAt: null,
        deliveredAt: now,
        openedAt: now,
      }),
    );

    for (const recipient of input.recipients) {
      states.push(
        stateRepo.create({
          messageId: input.message.id,
          threadId: input.message.threadId,
          userId: recipient.id,
          relationType: recipient.relationType,
          recipientEmail: recipient.email,
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
          deliveredAt: now,
          openedAt: null,
        }),
      );
    }

    return stateRepo.save(states);
  }
}
