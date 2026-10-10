import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';

@Injectable()
export class CleanOrphanAttachmentsJob {
  private readonly logger = new Logger(CleanOrphanAttachmentsJob.name);

  constructor(
    @InjectRepository(MessageAttachmentEntity)
    private readonly attachmentRepository: Repository<MessageAttachmentEntity>,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  async run() {
    // This job is intentionally read-only. Physical or database deletion requires
    // the later quarantine phase and an explicit, recoverable operation.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const attachments = await this.attachmentRepository.find({
      where: { storageKey: Like('private/mail-attachments/%') },
    });
    const physicalKeys = this.fileStorage.list
      ? await this.fileStorage.list('private', 'mail-attachments')
      : [];
    const dbKeys = new Set(attachments.map((attachment) => attachment.storageKey));
    const physicalKeySet = new Set(physicalKeys);
    const missingPhysical = attachments
      .filter((attachment) => !physicalKeySet.has(attachment.storageKey))
      .map((attachment) => attachment.storageKey);
    const unreferencedPhysical = physicalKeys.filter((key) => !dbKeys.has(key));
    const unlinkedExpired = attachments.filter(
      (attachment) =>
        !attachment.messageId &&
        !attachment.draftId &&
        attachment.createdAt <= cutoff,
    );

    const result = {
      scanned: attachments.length,
      physical: physicalKeys.length,
      missingPhysical,
      unreferencedPhysical,
      unlinkedExpired: unlinkedExpired.map((attachment) => attachment.id),
      deleted: 0,
    };
    this.logger.warn(
      `clean-orphan-attachments audit=${JSON.stringify({
        scanned: result.scanned,
        physical: result.physical,
        missingPhysical: result.missingPhysical.length,
        unreferencedPhysical: result.unreferencedPhysical.length,
        unlinkedExpired: result.unlinkedExpired.length,
      })}`,
    );
    return result;
  }
}
