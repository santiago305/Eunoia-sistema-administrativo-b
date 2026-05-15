import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { AccessControlPort } from 'src/modules/mail/application/ports/access-control.port';
import { MessageEntity } from '../persistence/typeorm/entities/message.entity';
import { MessageUserStateEntity } from '../persistence/typeorm/entities/message-user-state.entity';
import { MessageAttachmentEntity } from '../persistence/typeorm/entities/message-attachment.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AccessControlAdapter implements AccessControlPort {
  constructor(
    private readonly accessControlService: AccessControlService,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly attachmentRepository: Repository<MessageAttachmentEntity>,
  ) {}

  async getAllowedNotificationModules(userId: string, modulePermissions: Record<string, string[]>): Promise<string[]> {
    const entries = await Promise.all(
      Object.entries(modulePermissions).map(async ([moduleKey, requiredPermissions]) => ({
        moduleKey,
        allowed: await this.accessControlService.userHasAllPermissions(userId, requiredPermissions),
      })),
    );

    return entries.filter((entry) => entry.allowed).map((entry) => entry.moduleKey);
  }

  async canViewModuleMessages(userId: string, _originModule: string, requiredPermissions: string[]): Promise<boolean> {
    return this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
  }

  async canOpenMessage(
    userId: string,
    messageId: string,
    originModule: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const hasModulePermission = await this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
    if (!hasModulePermission) return false;

    const ownMessage = await this.messageRepository.findOne({
      where: { id: messageId, senderUserId: userId, originModule },
      select: ['id'],
    });
    if (ownMessage) return true;

    const participant = await this.messageUserStateRepository.findOne({
      where: { messageId, userId },
      select: ['id'],
    });

    return Boolean(participant);
  }

  async canDownloadAttachment(
    userId: string,
    attachmentId: string,
    originModule: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const hasModulePermission = await this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
    if (!hasModulePermission) return false;

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      select: ['id', 'messageId', 'draftId', 'uploadedByUserId'],
    });
    if (!attachment) return false;

    if (attachment.uploadedByUserId === userId) return true;

    const ownerMessageId = attachment.messageId ?? attachment.draftId;
    if (!ownerMessageId) return false;

    const message = await this.messageRepository.findOne({
      where: { id: ownerMessageId, originModule },
      select: ['id', 'senderUserId'],
    });
    if (!message) return false;

    if (message.senderUserId === userId) return true;

    const participant = await this.messageUserStateRepository.findOne({
      where: { messageId: message.id, userId },
      select: ['id'],
    });

    return Boolean(participant);
  }
}
