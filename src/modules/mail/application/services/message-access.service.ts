import { ForbiddenException, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';

@Injectable()
export class MessageAccessService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
  ) {}

  async ensureCanAccessModule(
    userId: string,
    moduleKey: string,
    modulePermissions: Record<string, string[]>,
  ) {
    const requiredPermissions = modulePermissions[moduleKey];
    if (!requiredPermissions) {
      throw new ForbiddenException('ORIGIN_MODULE_ACCESS_DENIED');
    }
    const allowed = await this.accessControlPort.canViewModuleMessages(userId, moduleKey, requiredPermissions);
    if (!allowed) {
      throw new ForbiddenException('ORIGIN_MODULE_ACCESS_DENIED');
    }
  }

  async ensureMessageParticipant(userId: string, messageId: string) {
    const ownMessage = await this.messageRepository.findOne({ where: { id: messageId, senderUserId: userId } });
    if (ownMessage) return true;
    const state = await this.messageUserStateRepository.findOne({ where: { messageId, userId } });
    return Boolean(state);
  }
}
