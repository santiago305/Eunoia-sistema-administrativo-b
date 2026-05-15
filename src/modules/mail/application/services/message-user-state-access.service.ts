import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

@Injectable()
export class MessageUserStateAccessService {
  constructor(
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
  ) {}

  async findMessageStateOrThrow(userId: string, stateId: string) {
    const state =
      (await this.messageUserStateRepository.findOne({
        where: { id: stateId, userId },
      })) ??
      (await this.messageUserStateRepository.findOne({
        where: { messageId: stateId, userId },
      }));
    if (!state) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    return state;
  }
}
