import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';
import { MessageAccessService } from './message-access.service';

export type MailAttachmentKind = 'file' | 'image';

@Injectable()
export class NotificationAttachmentsService {
  private readonly attachmentStorageDir = path.resolve(process.cwd(), 'storage', 'mail-attachments');
  private readonly allowedAttachmentMimeTypes = new Set([
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain',
  ]);
  private readonly allowedAttachmentExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.txt']);
  private readonly allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  private readonly maxAttachmentSizeBytes = 5 * 1024 * 1024;

  constructor(
    @InjectRepository(MessageAttachmentEntity)
    private readonly messageAttachmentRepository: Repository<MessageAttachmentEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
    private readonly messageAccessService: MessageAccessService,
  ) {}

  private normalizeKind(kind?: MailAttachmentKind): MailAttachmentKind {
    return kind === 'image' ? 'image' : 'file';
  }

  private validateAttachmentOrFail(fileName: string, mimeType: string, size: number, kind?: MailAttachmentKind) {
    const extension = path.extname(fileName).toLowerCase();
    const normalizedKind = this.normalizeKind(kind);
    if (!this.allowedAttachmentExtensions.has(extension)) throw new BadRequestException('ATTACHMENT_EXTENSION_NOT_ALLOWED');
    if (!this.allowedAttachmentMimeTypes.has(mimeType)) throw new BadRequestException('ATTACHMENT_MIME_NOT_ALLOWED');
    if (size > this.maxAttachmentSizeBytes) throw new BadRequestException('ATTACHMENT_TOO_LARGE');
    if (normalizedKind === 'image' && (!mimeType.startsWith('image/') || !this.allowedImageExtensions.has(extension))) {
      throw new BadRequestException('ATTACHMENT_IMAGE_MIME_REQUIRED');
    }
  }

  async linkAttachmentsToMessage(userId: string, messageId: string, attachmentIds: string[], draftId?: string, manager?: EntityManager) {
    const attachmentRepo = manager ? manager.getRepository(MessageAttachmentEntity) : this.messageAttachmentRepository;
    const ids = Array.from(new Set((attachmentIds ?? []).filter(Boolean)));
    const whereBase = ids.length ? ids.map((id) => ({ id, uploadedByUserId: userId })) : draftId ? [{ draftId, uploadedByUserId: userId }] : [];
    if (!whereBase.length) return;

    const attachments = await attachmentRepo.find({ where: whereBase });
    if (!attachments.length) return;

    attachments.forEach((attachment) => {
      attachment.messageId = messageId;
      attachment.draftId = null;
    });
    await attachmentRepo.save(attachments);
  }

  private async ensureAttachmentAccessOrFail(userId: string, attachment: MessageAttachmentEntity, modulePermissions: Record<string, string[]>) {
    if (attachment.uploadedByUserId === userId) return;
    const targetMessageId = attachment.messageId ?? attachment.draftId;
    if (!targetMessageId) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    const canAccess = await this.messageAccessService.ensureMessageParticipant(userId, targetMessageId);
    if (!canAccess) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    const relatedMessage = await this.messageRepository.findOne({ where: { id: targetMessageId } });
    if (relatedMessage) {
      const requiredPermissions = modulePermissions[relatedMessage.originModule] ?? ['page.notifications.view'];
      const allowed = await this.accessControlPort.canDownloadAttachment(userId, attachment.id, relatedMessage.originModule, requiredPermissions);
      if (!allowed) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }
  }

  async uploadAttachment(input: { userId: string; fileName: string; mimeType: string; size: number; buffer: Buffer; messageId?: string; draftId?: string; kind?: MailAttachmentKind; modulePermissions: Record<string, string[]>; }) {
    if (!input.fileName || !input.mimeType || !input.buffer?.length) throw new BadRequestException('ATTACHMENT_FILE_REQUIRED');
    if (!input.messageId && !input.draftId) throw new BadRequestException('ATTACHMENT_TARGET_REQUIRED');

    const attachmentKind = this.normalizeKind(input.kind);
    this.validateAttachmentOrFail(input.fileName, input.mimeType, input.size, attachmentKind);

    if (input.messageId) {
      const canAccess = await this.messageAccessService.ensureMessageParticipant(input.userId, input.messageId);
      if (!canAccess) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }

    if (input.draftId) {
      const draft = await this.messageRepository.findOne({ where: { id: input.draftId, createdByUserId: input.userId, isDraft: true, status: 'DRAFT' } });
      if (!draft) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }

    await fs.mkdir(this.attachmentStorageDir, { recursive: true });
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(input.fileName).toLowerCase()}`;
    const storageKey = path.join(this.attachmentStorageDir, storedName);
    await fs.writeFile(storageKey, input.buffer);

    const saved = await this.messageAttachmentRepository.save(this.messageAttachmentRepository.create({
      messageId: input.messageId ?? null,
      draftId: input.draftId ?? null,
      originalName: input.fileName,
      storedName,
      mimeType: input.mimeType,
      sizeBytes: String(input.size),
      storageKey,
      uploadedByUserId: input.userId,
      attachmentKind,
    }));

    return saved;
  }

  async downloadAttachment(userId: string, attachmentId: string, modulePermissions: Record<string, string[]>) {
    const attachment = await this.messageAttachmentRepository.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    await this.ensureAttachmentAccessOrFail(userId, attachment, modulePermissions);
    const fileBuffer = await fs.readFile(attachment.storageKey);
    return { attachment, buffer: fileBuffer };
  }

  async deleteAttachment(userId: string, attachmentId: string, modulePermissions: Record<string, string[]>) {
    const attachment = await this.messageAttachmentRepository.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    await this.ensureAttachmentAccessOrFail(userId, attachment, modulePermissions);

    await this.messageAttachmentRepository.delete({ id: attachment.id });
    try { await fs.unlink(attachment.storageKey); } catch {}
    return attachment;
  }
}
