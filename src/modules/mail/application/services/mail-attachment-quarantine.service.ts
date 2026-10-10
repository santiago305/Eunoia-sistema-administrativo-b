import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Repository } from 'typeorm';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { MailAttachmentQuarantineEntity } from '../../adapters/out/persistence/typeorm/entities/mail-attachment-quarantine.entity';

@Injectable()
export class MailAttachmentQuarantineService {
  constructor(
    @InjectRepository(MailAttachmentQuarantineEntity)
    private readonly quarantineRepository: Repository<MailAttachmentQuarantineEntity>,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  async quarantine(input: {
    originalKey: string;
    reason: string;
    attachmentId?: string;
    runId?: string;
  }) {
    const source = await this.fileStorage.read(input.originalKey).catch(() => null);
    if (!source?.length) throw new NotFoundException('ATTACHMENT_FILE_NOT_FOUND');

    const runId = input.runId ?? randomUUID();
    const sha256 = createHash('sha256').update(source).digest('hex');
    const extension = extname(this.fileStorage.resolve(input.originalKey).filename).replace(/^\./, '') || 'bin';
    const quarantineFile = await this.fileStorage.save({
      area: 'quarantine',
      directory: `mail-attachments/${runId}`,
      filename: `candidate-${randomUUID()}.${extension}`,
      extension,
      buffer: source,
    });

    try {
      const verification = await this.fileStorage.read(quarantineFile.key);
      const verifiedHash = createHash('sha256').update(verification).digest('hex');
      if (verification.length !== source.length || verifiedHash !== sha256) {
        throw new BadRequestException('QUARANTINE_HASH_MISMATCH');
      }
      return await this.quarantineRepository.save(
        this.quarantineRepository.create({
          runId,
          attachmentId: input.attachmentId ?? null,
          originalKey: input.originalKey,
          quarantineKey: quarantineFile.key,
          sha256,
          sizeBytes: String(source.length),
          reason: input.reason,
          status: 'QUARANTINED',
          approvedByUserId: null,
          restoredAt: null,
        }),
      );
    } catch (error) {
      await this.fileStorage.delete(quarantineFile.key).catch(() => undefined);
      throw error;
    }
  }

  async restore(quarantineId: string) {
    const record = await this.quarantineRepository.findOne({ where: { id: quarantineId } });
    if (!record) throw new NotFoundException('QUARANTINE_NOT_FOUND');
    if (record.status !== 'QUARANTINED') {
      throw new BadRequestException('QUARANTINE_NOT_RESTORABLE');
    }

    const originalExists = await this.fileStorage.exists(record.originalKey);
    if (originalExists) {
      await this.fileStorage.delete(record.quarantineKey);
    } else if (this.fileStorage.move) {
      const restored = await this.fileStorage.move(record.quarantineKey, record.originalKey);
      if (!restored) throw new NotFoundException('QUARANTINE_FILE_NOT_FOUND');
    } else {
      throw new BadRequestException('QUARANTINE_RESTORE_UNSUPPORTED');
    }

    await this.quarantineRepository.update(quarantineId, {
      status: 'RESTORED',
      restoredAt: new Date(),
    });
    return { id: quarantineId, status: 'RESTORED', originalKey: record.originalKey };
  }
}
