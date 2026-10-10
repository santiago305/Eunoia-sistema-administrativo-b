import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MailAttachmentOperationEntity } from '../../adapters/out/persistence/typeorm/entities/mail-attachment-operation.entity';
import { MailStorageQuotaService } from '../../application/services/mail-storage-quota.service';

@Injectable()
export class RecoverMailAttachmentOperationsJob {
  private readonly logger = new Logger(RecoverMailAttachmentOperationsJob.name);

  constructor(
    @InjectRepository(MailAttachmentOperationEntity)
    private readonly operationRepository: Repository<MailAttachmentOperationEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly attachmentRepository: Repository<MessageAttachmentEntity>,
    private readonly quotaService: MailStorageQuotaService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  async run(limit = 100) {
    const operations = await this.operationRepository.find({
      where: { status: In(['PENDING', 'STAGED', 'REGISTERED']) },
      order: { createdAt: 'ASC' },
      take: limit,
    });
    let recovered = 0;
    let failed = 0;

    for (const operation of operations) {
      try {
        if (operation.attachmentId) {
          const attachment = await this.attachmentRepository.findOne({ where: { id: operation.attachmentId } });
          if (!attachment) throw new Error('RECOVERY_ATTACHMENT_NOT_FOUND');
          await this.quotaService.trackAttachmentOwnership({
            attachmentId: attachment.id,
            userId: operation.userId,
            messageId: attachment.messageId,
          });
          await this.operationRepository.update(operation.id, {
            status: 'ACTIVE',
            completedAt: new Date(),
            lastError: null,
          });
          recovered += 1;
          continue;
        }

        if (operation.storageKey && await this.fileStorage.exists(operation.storageKey)) {
          await this.fileStorage.delete(operation.storageKey);
        }
        await this.operationRepository.update(operation.id, {
          status: 'FAILED',
          attempts: (operation.attempts ?? 0) + 1,
          lastError: 'RECOVERY_STORAGE_WITHOUT_ATTACHMENT',
        });
        failed += 1;
      } catch (error) {
        await this.operationRepository.update(operation.id, {
          status: 'FAILED',
          attempts: (operation.attempts ?? 0) + 1,
          lastError: (error as Error)?.message ?? 'unknown',
        });
        failed += 1;
      }
    }

    this.logger.debug(`recover-mail-attachment-operations scanned=${operations.length} recovered=${recovered} failed=${failed}`);
    return { scanned: operations.length, recovered, failed };
  }
}
