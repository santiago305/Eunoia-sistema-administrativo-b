import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MailAttachmentUserRefEntity } from '../../adapters/out/persistence/typeorm/entities/mail-attachment-user-ref.entity';
import { MailAttachmentOperationEntity } from '../../adapters/out/persistence/typeorm/entities/mail-attachment-operation.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';
import { MessageAccessService } from './message-access.service';
import { MailStorageQuotaService } from './mail-storage-quota.service';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { IMAGE_PROCESSOR, ImageProcessor } from 'src/shared/application/ports/image-processor.port';
import { prepareImageForStorage } from 'src/shared/utilidades/utils/prepare-image-for-storage';

export type MailAttachmentKind = 'file' | 'image';
type DetectedAttachmentSignature =
  | 'pdf'
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'gif'
  | 'ole2'
  | 'zip'
  | 'text'
  | 'unknown';

@Injectable()
export class NotificationAttachmentsService {
  private readonly logger = new Logger(NotificationAttachmentsService.name);
  private readonly allowedAttachmentMimeTypes = new Set([
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain',
  ]);
  private readonly allowedAttachmentExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.txt']);
  private readonly allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  private readonly maxAttachmentSizeBytes = 5 * 1024 * 1024;
  private readonly allowedMimeTypesByExtension = new Map<string, string[]>([
    ['.pdf', ['application/pdf']],
    ['.jpg', ['image/jpeg']],
    ['.jpeg', ['image/jpeg']],
    ['.png', ['image/png']],
    ['.webp', ['image/webp']],
    ['.gif', ['image/gif']],
    ['.doc', ['application/msword']],
    ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
    ['.xls', ['application/vnd.ms-excel']],
    ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
    ['.txt', ['text/plain']],
  ]);

  constructor(
    @InjectRepository(MessageAttachmentEntity)
    private readonly messageAttachmentRepository: Repository<MessageAttachmentEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MailAttachmentUserRefEntity)
    private readonly attachmentUserRefRepository: Repository<MailAttachmentUserRefEntity>,
    @InjectRepository(MailAttachmentOperationEntity)
    private readonly operationRepository: Repository<MailAttachmentOperationEntity>,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
    private readonly messageAccessService: MessageAccessService,
    private readonly mailStorageQuotaService: MailStorageQuotaService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
  ) {}

  private normalizeKind(kind?: MailAttachmentKind): MailAttachmentKind {
    return kind === 'image' ? 'image' : 'file';
  }

  private startsWithBytes(buffer: Buffer, bytes: number[]) {
    if (buffer.length < bytes.length) return false;
    return bytes.every((byte, index) => buffer[index] === byte);
  }

  private looksLikeTextPlain(buffer: Buffer) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
    if (!sample.length) return false;
    let printable = 0;
    for (const byte of sample) {
      if (byte === 0x00) return false;
      const isControl = byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d;
      if (!isControl) printable += 1;
    }
    return printable / sample.length >= 0.85;
  }

  private detectAttachmentSignature(buffer: Buffer): DetectedAttachmentSignature {
    if (this.startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
    if (this.startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
    if (this.startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
    if (
      this.startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
      buffer.length >= 12 &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'webp';
    }
    if (this.startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38])) return 'gif';
    if (this.startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole2';
    if (this.startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
    if (this.looksLikeTextPlain(buffer)) return 'text';
    return 'unknown';
  }

  private validateAttachmentSignatureOrFail(extension: string, signature: DetectedAttachmentSignature) {
    const signaturesByExtension: Record<string, DetectedAttachmentSignature[]> = {
      '.pdf': ['pdf'],
      '.jpg': ['jpeg'],
      '.jpeg': ['jpeg'],
      '.png': ['png'],
      '.webp': ['webp'],
      '.gif': ['gif'],
      '.doc': ['ole2'],
      '.xls': ['ole2'],
      '.docx': ['zip'],
      '.xlsx': ['zip'],
      '.txt': ['text'],
    };
    const expectedSignatures = signaturesByExtension[extension] ?? [];
    if (!expectedSignatures.length) return;
    if (!expectedSignatures.includes(signature)) {
      throw new BadRequestException('ATTACHMENT_SIGNATURE_MISMATCH');
    }
  }

  private validateAttachmentOrFail(
    fileName: string,
    mimeType: string,
    size: number,
    buffer: Buffer,
    kind?: MailAttachmentKind,
  ) {
    const extension = path.extname(fileName).toLowerCase();
    const normalizedKind = this.normalizeKind(kind);
    if (!this.allowedAttachmentExtensions.has(extension)) throw new BadRequestException('ATTACHMENT_EXTENSION_NOT_ALLOWED');
    if (!this.allowedAttachmentMimeTypes.has(mimeType)) throw new BadRequestException('ATTACHMENT_MIME_NOT_ALLOWED');
    if (size > this.maxAttachmentSizeBytes) throw new BadRequestException('ATTACHMENT_TOO_LARGE');
    const allowedMimeTypes = this.allowedMimeTypesByExtension.get(extension) ?? [];
    if (allowedMimeTypes.length && !allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('ATTACHMENT_MIME_NOT_ALLOWED');
    }
    const detectedSignature = this.detectAttachmentSignature(buffer);
    this.validateAttachmentSignatureOrFail(extension, detectedSignature);
    if (normalizedKind === 'image' && (!mimeType.startsWith('image/') || !this.allowedImageExtensions.has(extension))) {
      throw new BadRequestException('ATTACHMENT_IMAGE_MIME_REQUIRED');
    }
  }

  async linkAttachmentsToMessage(userId: string, messageId: string, attachmentIds: string[], draftId?: string, manager?: EntityManager) {
    const attachmentRepo = manager ? manager.getRepository(MessageAttachmentEntity) : this.messageAttachmentRepository;
    const ids = Array.from(new Set((attachmentIds ?? []).filter(Boolean)));
    const whereBase = ids.length
      ? ids.map((id) => ({
          id,
          uploadedByUserId: userId,
          ...(draftId ? { draftId } : {}),
        }))
      : draftId
        ? [{ draftId, uploadedByUserId: userId }]
        : [];
    if (!whereBase.length) return;

    const attachments = await attachmentRepo.find({ where: whereBase });
    if (!attachments.length) return;

    attachments.forEach((attachment) => {
      attachment.messageId = messageId;
      attachment.draftId = null;
    });
    await attachmentRepo.save(attachments);
    await this.mailStorageQuotaService.syncAttachmentRefsToMessage({
      attachmentIds: attachments.map((attachment) => attachment.id),
      userId,
      messageId,
      manager,
    });
  }

  private async ensureAttachmentAccessOrFail(userId: string, attachment: MessageAttachmentEntity, modulePermissions: Record<string, string[]>) {
    const activeRef = await this.attachmentUserRefRepository.findOne({
      where: {
        attachmentId: attachment.id,
        userId,
        countsStorage: true,
        permanentlyDeletedAt: IsNull(),
      },
      select: ['id'],
    });
    if (!activeRef) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');

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

  async uploadAttachment(input: { userId: string; fileName: string; mimeType: string; size: number; buffer: Buffer; messageId?: string; draftId?: string; kind?: MailAttachmentKind; idempotencyKey?: string; modulePermissions: Record<string, string[]>; }) {
    if (!input.fileName || !input.mimeType || !input.buffer?.length) throw new BadRequestException('ATTACHMENT_FILE_REQUIRED');
    if (!input.messageId && !input.draftId) throw new BadRequestException('ATTACHMENT_TARGET_REQUIRED');

    const attachmentKind = this.normalizeKind(input.kind);
    this.validateAttachmentOrFail(input.fileName, input.mimeType, input.size, input.buffer, attachmentKind);

    if (input.messageId) {
      const canAccess = await this.messageAccessService.ensureMessageParticipant(input.userId, input.messageId);
      if (!canAccess) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }

    if (input.draftId) {
      const draft = await this.messageRepository.findOne({ where: { id: input.draftId, createdByUserId: input.userId, isDraft: true, status: 'DRAFT' } });
      if (!draft) throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }

    const preparedFile = await prepareImageForStorage(
      {
        buffer: input.buffer,
        originalname: input.fileName,
        mimetype: input.mimeType,
        size: input.size,
      } as Express.Multer.File,
      this.imageProcessor,
      {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 80,
        maxInputBytes: this.maxAttachmentSizeBytes,
        maxInputPixels: 20_000_000,
        maxOutputBytes: this.maxAttachmentSizeBytes,
      },
    );

    await this.mailStorageQuotaService.assertCanAddBytes(input.userId, preparedFile.sizeBytes);

    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${preparedFile.extension}`;
    const contentHash = createHash('sha256').update(preparedFile.buffer).digest('hex');
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    let operation: MailAttachmentOperationEntity | null = null;
    if (idempotencyKey) {
      operation = await this.operationRepository.findOne({
        where: { userId: input.userId, idempotencyKey },
      });
      if (operation?.status === 'ACTIVE' && operation.attachmentId) {
        if (operation.sha256 && operation.sha256 !== contentHash) {
          throw new BadRequestException('ATTACHMENT_IDEMPOTENCY_CONTENT_MISMATCH');
        }
        const existingAttachment = await this.messageAttachmentRepository.findOne({
          where: { id: operation.attachmentId },
        });
        if (existingAttachment) return existingAttachment;
      }
      if (operation?.sha256 && operation.sha256 !== contentHash) {
        throw new BadRequestException('ATTACHMENT_IDEMPOTENCY_CONTENT_MISMATCH');
      }
    }

    try {
      operation = await this.operationRepository.save(
        operation
          ? this.operationRepository.create({
              ...operation,
              status: 'PENDING',
              lastError: null,
              attempts: operation.attempts ?? 0,
            })
          : this.operationRepository.create({
              userId: input.userId,
              messageId: input.messageId ?? null,
              draftId: input.draftId ?? null,
              idempotencyKey,
              status: 'PENDING',
              attachmentId: null,
              storageKey: null,
              expectedSizeBytes: String(preparedFile.sizeBytes),
              actualSizeBytes: null,
              sha256: contentHash,
              attempts: 0,
              lastError: null,
              completedAt: null,
            }),
      );
    } catch (error) {
      this.logger.error(`No se pudo registrar la operación durable del adjunto: ${(error as Error)?.message ?? 'unknown'}`);
      throw error;
    }

    let stored: Awaited<ReturnType<FileStorage['save']>> | null = null;
    let staged: Awaited<ReturnType<FileStorage['save']>> | null = null;
    let saved: MessageAttachmentEntity | null = null;
    try {
      staged = await this.fileStorage.save({
        area: 'staging',
        directory: 'mail-attachments',
        buffer: preparedFile.buffer,
        extension: preparedFile.extension,
        filename: storedName,
      });
      await this.operationRepository.update(operation.id, {
        status: 'STAGED',
        storageKey: staged.key,
        actualSizeBytes: String(preparedFile.sizeBytes),
        sha256: contentHash,
      });

      stored = this.fileStorage.move
        ? await this.fileStorage.move(staged.key, `private/mail-attachments/${storedName}`)
        : null;
      if (!stored) {
        stored = await this.fileStorage.save({
          area: 'private',
          directory: 'mail-attachments',
          buffer: preparedFile.buffer,
          extension: preparedFile.extension,
          filename: storedName,
        });
        await this.fileStorage.delete(staged.key);
      }
      const storageKey = stored.key;
      await this.operationRepository.update(operation.id, {
        status: 'STAGED',
        storageKey,
        actualSizeBytes: String(preparedFile.sizeBytes),
        sha256: contentHash,
      });

      saved = await this.messageAttachmentRepository.save(this.messageAttachmentRepository.create({
        messageId: input.messageId ?? null,
        draftId: input.draftId ?? null,
        originalName: input.fileName,
        storedName,
        mimeType: preparedFile.mimeType,
        sizeBytes: String(preparedFile.sizeBytes),
        storageKey,
        uploadedByUserId: input.userId,
        attachmentKind,
      }));
      await this.operationRepository.update(operation.id, {
        status: 'REGISTERED',
        attachmentId: saved.id,
      });
      await this.mailStorageQuotaService.trackAttachmentOwnership({
        attachmentId: saved.id,
        userId: input.userId,
        messageId: saved.messageId,
      });
      await this.operationRepository.update(operation.id, {
        status: 'ACTIVE',
        completedAt: new Date(),
        lastError: null,
      });

      return saved;
    } catch (error) {
      if (operation?.id) {
        try {
          await this.operationRepository.update(operation.id, {
            status: 'FAILED',
            attempts: (operation.attempts ?? 0) + 1,
            lastError: (error as Error)?.message ?? 'unknown',
          });
        } catch (operationError) {
          this.logger.error(`No se pudo marcar la operación ${operation.id} como FAILED: ${(operationError as Error)?.message ?? 'unknown'}`);
        }
      }
      if (saved?.id) {
        try {
          await this.messageAttachmentRepository.delete(saved.id);
        } catch (cleanupError) {
          this.logger.error(
            `No se pudo revertir el registro del adjunto ${saved.id}: ${(cleanupError as Error)?.message ?? 'unknown'}`,
          );
        }
      }
      if (stored) {
        try {
          await this.fileStorage.delete(stored.key);
        } catch (cleanupError) {
          this.logger.error(
            `No se pudo limpiar el archivo ${stored.key} tras una carga fallida: ${(cleanupError as Error)?.message ?? 'unknown'}`,
          );
        }
      }
      if (staged && staged.key !== stored?.key) {
        try {
          await this.fileStorage.delete(staged.key);
        } catch (cleanupError) {
          this.logger.error(
            `No se pudo limpiar el staging ${staged.key}: ${(cleanupError as Error)?.message ?? 'unknown'}`,
          );
        }
      }
      throw error;
    }
  }

  private async moveAttachmentToDeletedArea(attachment: MessageAttachmentEntity) {
    const moved = await this.fileStorage.moveToDeleted(attachment.storageKey, 'mail-attachments');
    if (!moved) {
      throw new NotFoundException('ATTACHMENT_FILE_NOT_FOUND');
    }
    return moved;
  }

  private async restoreMovedAttachments(
    moved: Array<{ originalKey: string; deletedKey: string }>,
  ) {
    if (!this.fileStorage.move) return;
    for (const item of [...moved].reverse()) {
      try {
        await this.fileStorage.move(item.deletedKey, item.originalKey);
      } catch (error) {
        this.logger.error(
          `No se pudo restaurar ${item.deletedKey} a ${item.originalKey}: ${(error as Error)?.message ?? 'unknown'}`,
        );
      }
    }
  }

  async purgeDraftAttachments(
    userId: string,
    draftId: string,
    manager?: EntityManager,
  ) {
    const attachmentRepo = manager ? manager.getRepository(MessageAttachmentEntity) : this.messageAttachmentRepository;
    const attachments = await attachmentRepo.find({
      where: { draftId, uploadedByUserId: userId },
    });
    if (!attachments.length) return { deleted: 0 };

    const moved: Array<{ originalKey: string; deletedKey: string }> = [];
    try {
      for (const attachment of attachments) {
        const movedFile = await this.moveAttachmentToDeletedArea(attachment);
        moved.push({ originalKey: attachment.storageKey, deletedKey: movedFile.key });
      }

      const attachmentIds = attachments.map((attachment) => attachment.id);
      await this.mailStorageQuotaService.releaseAttachmentRefs({
        attachmentIds,
        userId,
        manager,
      });
      await attachmentRepo.delete(attachmentIds);

      return { deleted: attachmentIds.length };
    } catch (error) {
      await this.restoreMovedAttachments(moved);
      throw error;
    }
  }

  async downloadAttachment(userId: string, attachmentId: string, modulePermissions: Record<string, string[]>) {
    const attachment = await this.messageAttachmentRepository.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    await this.ensureAttachmentAccessOrFail(userId, attachment, modulePermissions);
    let fileBuffer: Buffer;
    try {
      fileBuffer = await this.fileStorage.read(attachment.storageKey);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        throw new NotFoundException('ATTACHMENT_UNAVAILABLE');
      }
      throw error;
    }
    return { attachment, buffer: fileBuffer };
  }

  async listUserFiles(
    userId: string,
    query?: { type?: 'all' | 'image' | 'file'; page?: number; limit?: number; q?: string },
  ) {
    const type = query?.type === 'image' || query?.type === 'file' ? query.type : 'all';
    const page = Math.max(1, Math.trunc(Number(query?.page ?? 1) || 1));
    const limit = Math.max(1, Math.min(100, Math.trunc(Number(query?.limit ?? 50) || 50)));
    const q = String(query?.q ?? '').trim().toLowerCase();

    const baseQb = this.attachmentUserRefRepository
      .createQueryBuilder('ref')
      .innerJoin(MessageAttachmentEntity, 'att', 'att.id = ref.attachment_id')
      .where('ref.user_id = :userId', { userId })
      .andWhere('ref.counts_storage = true')
      .andWhere('ref.permanently_deleted_at IS NULL');

    if (type === 'image') {
      baseQb.andWhere("att.attachment_kind = 'image'");
    } else if (type === 'file') {
      baseQb.andWhere("att.attachment_kind = 'file'");
    }
    if (q) {
      baseQb.andWhere('LOWER(att.original_name) LIKE :q', { q: `%${q}%` });
    }

    const totalRow = await baseQb.clone().select('COUNT(*)', 'total').getRawOne<{ total: string }>();
    const total = Number(totalRow?.total ?? 0);

    const rows = await baseQb
      .clone()
      .select([
        'att.id AS id',
        'att.original_name AS "name"',
        'att.mime_type AS "mimeType"',
        'att.size_bytes AS "sizeBytes"',
        'att.attachment_kind AS "attachmentKind"',
        'att.created_at AS "createdAt"',
        'att.message_id AS "messageId"',
      ])
      .orderBy('att.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{
        id: string;
        name: string;
        mimeType: string;
        sizeBytes: string;
        attachmentKind: 'file' | 'image';
        createdAt: Date;
        messageId: string | null;
      }>();

    return {
      page,
      limit,
      total,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        mimeType: row.mimeType,
        sizeBytes: Number(row.sizeBytes ?? 0),
        attachmentKind: row.attachmentKind,
        createdAt: row.createdAt,
        messageId: row.messageId,
      })),
    };
  }

  async deleteAttachmentForUser(userId: string, attachmentId: string, modulePermissions: Record<string, string[]>) {
    const attachment = await this.messageAttachmentRepository.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    await this.ensureAttachmentAccessOrFail(userId, attachment, modulePermissions);

    const now = new Date();

    // If uploader deletes from Files, the attachment becomes globally unavailable.
    // This keeps the message history, but the binary moves to deleted storage immediately.
    if (attachment.uploadedByUserId === userId) {
      await this.attachmentUserRefRepository
        .createQueryBuilder()
        .update(MailAttachmentUserRefEntity)
        .set({
          deletedAt: now,
          permanentlyDeletedAt: now,
          countsStorage: false,
        })
        .where('attachment_id = :attachmentId', { attachmentId: attachment.id })
        .andWhere('permanently_deleted_at IS NULL')
        .execute();

      await this.moveAttachmentToDeletedArea(attachment);
      return { attachment, fullyReleased: true };
    }

    const ref = await this.attachmentUserRefRepository.findOne({
      where: {
        attachmentId: attachment.id,
        userId,
        permanentlyDeletedAt: IsNull(),
      },
    });
    if (!ref) throw new NotFoundException('ATTACHMENT_NOT_FOUND');

    ref.deletedAt = now;
    ref.permanentlyDeletedAt = now;
    ref.countsStorage = false;
    await this.attachmentUserRefRepository.save(ref);

    const activeRefsCount = await this.attachmentUserRefRepository.count({
      where: {
        attachmentId: attachment.id,
        countsStorage: true,
        permanentlyDeletedAt: IsNull(),
      },
    });
    if (activeRefsCount === 0) {
      await this.moveAttachmentToDeletedArea(attachment);
    }

    return { attachment, fullyReleased: activeRefsCount === 0 };
  }

  async deleteAttachment(userId: string, attachmentId: string, modulePermissions: Record<string, string[]>) {
    const result = await this.deleteAttachmentForUser(userId, attachmentId, modulePermissions);
    return result.attachment;
  }

  async bulkDeleteAttachmentsForUser(
    userId: string,
    attachmentIds: string[],
    modulePermissions: Record<string, string[]>,
  ) {
    const ids = Array.from(new Set((attachmentIds ?? []).filter(Boolean)));
    if (!ids.length) return { deleted: 0 };
    let deleted = 0;
    for (const attachmentId of ids) {
      try {
        await this.deleteAttachmentForUser(userId, attachmentId, modulePermissions);
        deleted += 1;
      } catch (error) {
        const code = (error as { message?: string })?.message;
        if (code === 'ATTACHMENT_NOT_FOUND') continue;
        throw error;
      }
    }
    return { deleted };
  }
}
