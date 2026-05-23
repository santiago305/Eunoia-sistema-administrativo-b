import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Repository } from 'typeorm';
import { envs } from 'src/infrastructure/config/envs';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MailAttachmentUserRefEntity } from '../../adapters/out/persistence/typeorm/entities/mail-attachment-user-ref.entity';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';

@Injectable()
export class PurgeDisabledUserMailJob {
  private readonly logger = new Logger(PurgeDisabledUserMailJob.name);
  private readonly attachmentActiveDir = path.resolve(process.cwd(), envs.mail.attachmentsDir);
  private readonly attachmentDeletedDir = path.resolve(process.cwd(), envs.mail.attachmentsDeletedDir);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MailAttachmentUserRefEntity)
    private readonly attachmentUserRefRepository: Repository<MailAttachmentUserRefEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly messageAttachmentRepository: Repository<MessageAttachmentEntity>,
  ) {}

  private buildCutoffDate(retentionDays: number) {
    return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  }

  private async moveAttachmentToDeletedArea(storageKey: string, storedName: string) {
    const normalizedStorageKey = path.resolve(storageKey);
    const normalizedActiveDir = this.attachmentActiveDir + path.sep;
    if (!normalizedStorageKey.startsWith(normalizedActiveDir)) {
      return;
    }

    try {
      await fs.access(normalizedStorageKey);
    } catch {
      return;
    }

    await fs.mkdir(this.attachmentDeletedDir, { recursive: true });
    const targetPath = path.join(this.attachmentDeletedDir, `${Date.now()}-${storedName}`);

    try {
      await fs.rename(normalizedStorageKey, targetPath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'EXDEV') throw error;
    }

    await fs.copyFile(normalizedStorageKey, targetPath);
    await fs.unlink(normalizedStorageKey);
  }

  async run(batchSize = 200) {
    const retentionDays = envs.mail.disabledUserRetentionDays;
    const cutoff = this.buildCutoffDate(retentionDays);

    const disabledUserRows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.user_id', 'id')
      .where('user.deleted = true')
      .andWhere('user.deleted_at IS NOT NULL')
      .andWhere('user.deleted_at <= :cutoff', { cutoff })
      .orderBy('user.deleted_at', 'ASC')
      .limit(batchSize)
      .getRawMany<{ id: string }>();

    const disabledUserIds = Array.from(
      new Set(disabledUserRows.map((row) => row.id).filter(Boolean)),
    );
    if (!disabledUserIds.length) {
      return { processedUsers: 0, statesUpdated: 0, refsUpdated: 0, movedFiles: 0 };
    }

    const statesResult = await this.messageUserStateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({
        permanentlyHiddenAt: () => 'NOW()',
        deletedAt: () => 'COALESCE(deleted_at, NOW())',
        trashExpiresAt: () => 'COALESCE(trash_expires_at, NOW())',
      })
      .where('user_id IN (:...userIds)', { userIds: disabledUserIds })
      .andWhere('permanently_hidden_at IS NULL')
      .execute();

    const impactedRefRows = await this.attachmentUserRefRepository
      .createQueryBuilder('ref')
      .select('DISTINCT ref.attachment_id', 'attachmentId')
      .where('ref.user_id IN (:...userIds)', { userIds: disabledUserIds })
      .getRawMany<{ attachmentId: string }>();
    const impactedAttachmentIds = Array.from(
      new Set(impactedRefRows.map((row) => row.attachmentId).filter(Boolean)),
    );

    const refsResult = await this.attachmentUserRefRepository
      .createQueryBuilder()
      .update(MailAttachmentUserRefEntity)
      .set({
        countsStorage: false,
        deletedAt: () => 'COALESCE(deleted_at, NOW())',
        permanentlyDeletedAt: () => 'COALESCE(permanently_deleted_at, NOW())',
      })
      .where('user_id IN (:...userIds)', { userIds: disabledUserIds })
      .andWhere('permanently_deleted_at IS NULL')
      .execute();

    let movedFiles = 0;
    if (impactedAttachmentIds.length) {
      const releasableAttachments = await this.messageAttachmentRepository
        .createQueryBuilder('att')
        .select([
          'att.id AS id',
          'att.storage_key AS "storageKey"',
          'att.stored_name AS "storedName"',
        ])
        .where('att.id IN (:...attachmentIds)', { attachmentIds: impactedAttachmentIds })
        .andWhere(
          `
            NOT EXISTS (
              SELECT 1
              FROM mail_attachment_user_refs ref
              WHERE ref.attachment_id = att.id
                AND ref.counts_storage = true
                AND ref.permanently_deleted_at IS NULL
            )
          `,
        )
        .getRawMany<{ id: string; storageKey: string; storedName: string }>();

      for (const attachment of releasableAttachments) {
        await this.moveAttachmentToDeletedArea(attachment.storageKey, attachment.storedName);
        movedFiles += 1;
      }
    }

    this.logger.debug(
      `purge-disabled-user-mail users=${disabledUserIds.length} states=${statesResult.affected ?? 0} refs=${refsResult.affected ?? 0} movedFiles=${movedFiles}`,
    );
    return {
      processedUsers: disabledUserIds.length,
      statesUpdated: statesResult.affected ?? 0,
      refsUpdated: refsResult.affected ?? 0,
      movedFiles,
    };
  }
}
