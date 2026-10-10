import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { envs } from 'src/infrastructure/config/envs';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageAuditLogEntity } from '../../adapters/out/persistence/typeorm/entities/message-audit-log.entity';
import { DeletedMailDataSourceProvider } from '../deleted-mail.datasource.provider';
import { DeletedMailMessageEntity } from '../../adapters/out/persistence/typeorm/entities/deleted-mail-message.entity';
import { DeletedMailMessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/deleted-mail-message-user-state.entity';
import { DeletedMailAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/deleted-mail-attachment.entity';
import { DeletedMailAuditLogEntity } from '../../adapters/out/persistence/typeorm/entities/deleted-mail-audit-log.entity';
import { DeletedMailArchiveOperationEntity } from '../../adapters/out/persistence/typeorm/entities/deleted-mail-archive-operation.entity';

@Injectable()
export class ArchiveDeletedMailJob {
  private readonly logger = new Logger(ArchiveDeletedMailJob.name);

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly messageAttachmentRepository: Repository<MessageAttachmentEntity>,
    @InjectRepository(MessageRecipientEntity)
    private readonly messageRecipientRepository: Repository<MessageRecipientEntity>,
    @InjectRepository(MessageAuditLogEntity)
    private readonly messageAuditLogRepository: Repository<MessageAuditLogEntity>,
    private readonly dataSource: DataSource,
    private readonly deletedMailDataSourceProvider: DeletedMailDataSourceProvider,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  private buildCutoffDate(retentionDays: number) {
    return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  }

  private async moveAttachmentToDeletedArea(storageKey: string) {
    const moved = await this.fileStorage.moveToDeleted(storageKey, 'mail-attachments');
    if (moved) return moved;

    // A retry may find the source already moved after a previous successful
    // filesystem step. Treat the deterministic final key as idempotent only
    // when it is actually present.
    const filename = this.fileStorage.resolve(storageKey).filename;
    const finalKey = `deleted/mail-attachments/${filename}`;
    if (await this.fileStorage.exists(finalKey)) {
      return this.fileStorage.resolve(finalKey);
    }
    throw new Error(`ARCHIVE_ATTACHMENT_FILE_NOT_FOUND:${storageKey}`);
  }

  private async verifyMovedAttachment(storageKey: string, expectedSize: number | string | null | undefined) {
    const content = await this.fileStorage.read(storageKey);
    const actualSize = content.length;
    if (expectedSize !== null && expectedSize !== undefined && Number(expectedSize) !== actualSize) {
      throw new Error(`ARCHIVE_ATTACHMENT_SIZE_MISMATCH:${storageKey}`);
    }
    return {
      actualSize,
      sha256: createHash('sha256').update(content).digest('hex'),
    };
  }

  async run(batchSize = 200) {
    const deletedDataSource = await this.deletedMailDataSourceProvider.getDataSource();
    if (!deletedDataSource) {
      this.logger.debug('archive-deleted-mail skipped: deleted DB not configured.');
      return { archived: 0, skipped: true, reason: 'deleted_db_unavailable' };
    }

    const retentionDays = envs.mail.deletedRetentionDays;
    const cutoff = this.buildCutoffDate(retentionDays);

    const candidateRows = await this.messageUserStateRepository
      .createQueryBuilder('mus')
      .select('mus.message_id', 'messageId')
      .where('mus.message_id IS NOT NULL')
      .groupBy('mus.message_id')
      .having('BOOL_AND(mus.permanently_hidden_at IS NOT NULL)')
      .andHaving('MAX(mus.permanently_hidden_at) <= :cutoff', { cutoff })
      .orderBy('MAX(mus.permanently_hidden_at)', 'ASC')
      .limit(batchSize)
      .getRawMany<{ messageId: string }>();

    const messageIds = Array.from(new Set(candidateRows.map((row) => row.messageId).filter(Boolean)));
    if (!messageIds.length) {
      return { archived: 0, skipped: false };
    }

    const [messages, states, attachments, recipients, audits] = await Promise.all([
      this.messageRepository.find({ where: { id: In(messageIds) } }),
      this.messageUserStateRepository.find({ where: { messageId: In(messageIds) } }),
      this.messageAttachmentRepository.find({ where: { messageId: In(messageIds) } }),
      this.messageRecipientRepository.find({ where: { messageId: In(messageIds) } }),
      this.messageAuditLogRepository.find({ where: { messageId: In(messageIds) } }),
    ]);
    const runId = randomUUID();

    const statesByMessageId = new Map<string, MessageUserStateEntity[]>();
    states.forEach((state) => {
      const bucket = statesByMessageId.get(state.messageId) ?? [];
      bucket.push(state);
      statesByMessageId.set(state.messageId, bucket);
    });
    const recipientsByMessageId = new Map<string, MessageRecipientEntity[]>();
    recipients.forEach((recipient) => {
      const bucket = recipientsByMessageId.get(recipient.messageId) ?? [];
      bucket.push(recipient);
      recipientsByMessageId.set(recipient.messageId, bucket);
    });
    const lastHiddenAtByMessageId = new Map<string, Date | null>();
    statesByMessageId.forEach((messageStates, messageId) => {
      const latest = messageStates.reduce<Date | null>((acc, state) => {
        if (!state.permanentlyHiddenAt) return acc;
        if (!acc) return state.permanentlyHiddenAt;
        return state.permanentlyHiddenAt > acc ? state.permanentlyHiddenAt : acc;
      }, null);
      lastHiddenAtByMessageId.set(messageId, latest);
    });

    await deletedDataSource.transaction(async (manager) => {
      const deletedMessageRepo = manager.getRepository(DeletedMailMessageEntity);
      const deletedStateRepo = manager.getRepository(DeletedMailMessageUserStateEntity);
      const deletedAttachmentRepo = manager.getRepository(DeletedMailAttachmentEntity);
      const deletedAuditRepo = manager.getRepository(DeletedMailAuditLogEntity);

      await deletedMessageRepo.upsert(
        messages.map((message) => ({
          sourceMessageId: message.id,
          sourceThreadId: message.threadId,
          subject: message.subject,
          originModule: message.originModule,
          kind: message.kind,
          senderType: message.senderType,
          sourceCreatedAt: message.createdAt ?? null,
          sourceSentAt: message.sentAt ?? null,
          sourceLastHiddenAt: lastHiddenAtByMessageId.get(message.id) ?? null,
          archivedReason: 'ALL_STATES_HIDDEN',
          payload: {
            message,
            recipients: recipientsByMessageId.get(message.id) ?? [],
          },
        })),
        ['sourceMessageId'],
      );

      await deletedStateRepo.upsert(
        states.map((state) => ({
          sourceStateId: state.id,
          sourceMessageId: state.messageId,
          sourceUserId: state.userId,
          relationType: state.relationType,
          sourcePermanentlyHiddenAt: state.permanentlyHiddenAt ?? null,
          payload: { ...state } as Record<string, unknown>,
        })),
        ['sourceStateId'],
      );

      await deletedAttachmentRepo.upsert(
        attachments.map((attachment) => ({
          sourceAttachmentId: attachment.id,
          sourceMessageId: attachment.messageId,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          storageKey: attachment.storageKey,
          attachmentKind: attachment.attachmentKind,
          payload: {
            uploadedByUserId: attachment.uploadedByUserId,
            createdAt: attachment.createdAt,
          },
        })),
        ['sourceAttachmentId'],
      );

      await deletedAuditRepo.upsert(
        audits.map((audit) => ({
          sourceAuditLogId: audit.id,
          sourceMessageId: audit.messageId,
          sourceThreadId: audit.threadId,
          actorUserId: audit.actorUserId,
          action: audit.action,
          metadata: audit.metadata,
          sourceCreatedAt: audit.createdAt,
        })),
        ['sourceAuditLogId'],
      );
    });

    await deletedDataSource.transaction(async (manager) => {
      for (const attachment of attachments) {
        await manager.query(
          `
            INSERT INTO deleted_mail_archive_operations
              (source_message_id, source_attachment_id, run_id, status,
               original_storage_key, expected_size_bytes, attempts, last_error)
            VALUES ($1, $2, $3, 'PENDING', $4, $5, 1, NULL)
            ON CONFLICT (source_attachment_id)
            DO UPDATE SET
              run_id = EXCLUDED.run_id,
              status = 'PENDING',
              original_storage_key = EXCLUDED.original_storage_key,
              expected_size_bytes = EXCLUDED.expected_size_bytes,
              attempts = deleted_mail_archive_operations.attempts + 1,
              last_error = NULL,
              updated_at = now(),
              completed_at = NULL
          `,
          [attachment.messageId, attachment.id, runId, attachment.storageKey, String(attachment.sizeBytes)],
        );
      }
    });

    const movedAttachments = [] as Array<{ id: string; key: string }>;
    for (const attachment of attachments) {
      let movedKey: string | null = null;
      try {
        const moved = await this.moveAttachmentToDeletedArea(attachment.storageKey);
        movedKey = moved.key;
        const verified = await this.verifyMovedAttachment(moved.key, attachment.sizeBytes);
        await deletedDataSource.transaction(async (manager) => {
          await manager.getRepository(DeletedMailArchiveOperationEntity).update(
            { sourceAttachmentId: attachment.id },
            {
              status: 'VERIFIED',
              finalStorageKey: moved.key,
              actualSizeBytes: String(verified.actualSize),
              sha256: verified.sha256,
              lastError: null,
            },
          );
        });
        movedAttachments.push({ id: attachment.id, key: moved.key });
      } catch (error) {
        if (movedKey && this.fileStorage.move) {
          try {
            await this.fileStorage.move(movedKey, attachment.storageKey);
          } catch (rollbackError) {
            this.logger.error(
              `archive-deleted-mail rollback failed attachment=${attachment.id}: ${(rollbackError as Error)?.message ?? 'unknown error'}`,
            );
          }
        }
        await deletedDataSource.transaction(async (manager) => {
          await manager.getRepository(DeletedMailArchiveOperationEntity).update(
            { sourceAttachmentId: attachment.id },
            { status: 'FAILED', lastError: (error as Error)?.message ?? 'unknown error' },
          );
        });
        throw error;
      }
    }

    // The archived record must point to the verified final key. This is kept
    // separate from the source transaction so a retry can repair it safely.
    await deletedDataSource.transaction(async (manager) => {
      const deletedAttachmentRepo = manager.getRepository(DeletedMailAttachmentEntity);
      for (const moved of movedAttachments) {
        await deletedAttachmentRepo.update(
          { sourceAttachmentId: moved.id },
          { storageKey: moved.key },
        );
        await manager.getRepository(DeletedMailArchiveOperationEntity).update(
          { sourceAttachmentId: moved.id },
          { status: 'COMMITTED', completedAt: new Date() },
        );
      }
    });

    await this.dataSource.transaction(async (manager) => {
      const threadIds = Array.from(
        new Set(
          messages
            .map((message) => message.threadId)
            .filter((threadId): threadId is string => Boolean(threadId)),
        ),
      );

      await manager.getRepository(MessageAuditLogEntity).delete({ messageId: In(messageIds) });
      await manager.getRepository(MessageRecipientEntity).delete({ messageId: In(messageIds) });
      await manager.getRepository(MessageUserStateEntity).delete({ messageId: In(messageIds) });
      await manager.getRepository(MessageAttachmentEntity).delete({ messageId: In(messageIds) });
      await manager.getRepository(MessageEntity).delete({ id: In(messageIds) });

      if (threadIds.length) {
        const orphanThreadRows = await manager.query(
          `
            SELECT mt.id
            FROM message_threads mt
            WHERE mt.id = ANY($1::uuid[])
              AND NOT EXISTS (
                SELECT 1
                FROM messages m
                WHERE m.thread_id = mt.id
              )
          `,
          [threadIds],
        );
        const orphanThreadIds = orphanThreadRows.map((row: { id: string }) => row.id).filter(Boolean);
        if (orphanThreadIds.length) {
          await manager.query(
            `
              DELETE FROM message_threads
              WHERE id = ANY($1::uuid[])
            `,
            [orphanThreadIds],
          );
        }
      }
    });

    this.logger.debug(`archive-deleted-mail archived=${messageIds.length}`);
    return { archived: messageIds.length, skipped: false };
  }
}
