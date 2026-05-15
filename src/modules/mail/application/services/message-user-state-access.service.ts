import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';
import { NOTIFICATION_MODULE_PERMISSIONS } from '../constants/notification-module-permissions';

@Injectable()
export class MessageUserStateAccessService {
  constructor(
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
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

    const message = await this.messageRepository.findOne({
      where: { id: state.messageId },
      select: ['id', 'originModule'],
    });
    if (!message) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }

    const requiredPermissions = NOTIFICATION_MODULE_PERMISSIONS[message.originModule] ?? ['page.notifications.view'];
    const canOpen = await this.accessControlPort.canOpenMessage(
      userId,
      message.id,
      message.originModule,
      requiredPermissions,
    );
    if (!canOpen) {
      throw new ForbiddenException('MESSAGE_ACCESS_DENIED');
    }

    return state;
  }
}
