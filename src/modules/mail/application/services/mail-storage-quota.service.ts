import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { envs } from 'src/infrastructure/config/envs';
import { MailStorageQuotaEntity } from '../../adapters/out/persistence/typeorm/entities/mail-storage-quota.entity';
import { MailAttachmentUserRefEntity } from '../../adapters/out/persistence/typeorm/entities/mail-attachment-user-ref.entity';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';

const ONE_GB_BYTES = 1024 * 1024 * 1024;
const MIN_QUOTA_GB = 1;
const MAX_QUOTA_GB = 5;

@Injectable()
export class MailStorageQuotaService {
  constructor(
    @InjectRepository(MailStorageQuotaEntity)
    private readonly quotaRepository: Repository<MailStorageQuotaEntity>,
    @InjectRepository(MailAttachmentUserRefEntity)
    private readonly attachmentUserRefRepository: Repository<MailAttachmentUserRefEntity>,
  ) {}

  private resolveDefaultQuotaBytes() {
    const gb = Number(envs.mail?.defaultUserStorageGb ?? MIN_QUOTA_GB);
    const safeGb = Number.isFinite(gb)
      ? Math.max(MIN_QUOTA_GB, Math.min(MAX_QUOTA_GB, Math.trunc(gb)))
      : MIN_QUOTA_GB;
    return safeGb * ONE_GB_BYTES;
  }

  private clampQuotaGb(value: number) {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new BadRequestException('MAIL_STORAGE_QUOTA_INVALID');
    }
    const normalized = Math.trunc(value);
    if (normalized < MIN_QUOTA_GB || normalized > MAX_QUOTA_GB) {
      throw new BadRequestException('MAIL_STORAGE_QUOTA_RANGE_INVALID');
    }
    return normalized;
  }

  private toBytes(gb: number) {
    return gb * ONE_GB_BYTES;
  }

  async ensureQuotaRecord(userId: string, manager?: EntityManager) {
    const quotaRepo = manager ? manager.getRepository(MailStorageQuotaEntity) : this.quotaRepository;
    let quota = await quotaRepo.findOne({ where: { userId } });
    if (quota) return quota;

    quota = quotaRepo.create({
      userId,
      quotaBytes: String(this.resolveDefaultQuotaBytes()),
      updatedByUserId: null,
    });
    return quotaRepo.save(quota);
  }

  async setQuotaGb(userId: string, quotaGb: number, updatedByUserId: string, manager?: EntityManager) {
    const normalizedQuotaGb = this.clampQuotaGb(quotaGb);
    const quotaRepo = manager ? manager.getRepository(MailStorageQuotaEntity) : this.quotaRepository;
    const quotaBytes = this.toBytes(normalizedQuotaGb);

    await quotaRepo.upsert(
      {
        userId,
        quotaBytes: String(quotaBytes),
        updatedByUserId,
      },
      ['userId'],
    );

    return this.getStorageSummary(userId, manager);
  }

  async getQuota(userId: string, manager?: EntityManager) {
    const quota = await this.ensureQuotaRecord(userId, manager);
    const quotaBytes = Number(quota.quotaBytes ?? 0);
    return {
      userId,
      quotaBytes,
      quotaGb: Math.max(MIN_QUOTA_GB, Math.round(quotaBytes / ONE_GB_BYTES)),
      updatedAt: quota.updatedAt,
      updatedByUserId: quota.updatedByUserId,
    };
  }

  async getUsage(userId: string, manager?: EntityManager) {
    const refRepo = manager ? manager.getRepository(MailAttachmentUserRefEntity) : this.attachmentUserRefRepository;
    const row = await refRepo
      .createQueryBuilder('ref')
      .innerJoin(MessageAttachmentEntity, 'att', 'att.id = ref.attachment_id')
      .where('ref.user_id = :userId', { userId })
      .andWhere('ref.counts_storage = true')
      .andWhere('ref.permanently_deleted_at IS NULL')
      .select('COALESCE(SUM(att.size_bytes::bigint), 0)', 'usedBytes')
      .getRawOne<{ usedBytes: string }>();

    return Number(row?.usedBytes ?? 0);
  }

  async assertCanAddBytes(userId: string, bytesToAdd: number, manager?: EntityManager) {
    const safeBytesToAdd = Number.isFinite(bytesToAdd) ? Math.max(0, Math.trunc(bytesToAdd)) : 0;
    const [quota, usedBytes] = await Promise.all([
      this.getQuota(userId, manager),
      this.getUsage(userId, manager),
    ]);

    if (usedBytes + safeBytesToAdd > quota.quotaBytes) {
      throw new BadRequestException('MAIL_STORAGE_QUOTA_EXCEEDED');
    }
  }

  async trackAttachmentOwnership(input: {
    attachmentId: string;
    userId: string;
    messageId?: string | null;
    manager?: EntityManager;
  }) {
    const refRepo = input.manager
      ? input.manager.getRepository(MailAttachmentUserRefEntity)
      : this.attachmentUserRefRepository;
    const existing = await refRepo.findOne({
      where: {
        attachmentId: input.attachmentId,
        userId: input.userId,
      },
    });

    if (existing) {
      existing.messageId = input.messageId ?? existing.messageId ?? null;
      existing.countsStorage = true;
      existing.deletedAt = null;
      existing.permanentlyDeletedAt = null;
      await refRepo.save(existing);
      return existing;
    }

    const created = refRepo.create({
      attachmentId: input.attachmentId,
      userId: input.userId,
      messageId: input.messageId ?? null,
      countsStorage: true,
      deletedAt: null,
      permanentlyDeletedAt: null,
    });
    return refRepo.save(created);
  }

  async syncAttachmentRefsToMessage(input: {
    attachmentIds: string[];
    userId: string;
    messageId: string;
    manager?: EntityManager;
  }) {
    const refRepo = input.manager
      ? input.manager.getRepository(MailAttachmentUserRefEntity)
      : this.attachmentUserRefRepository;
    const ids = Array.from(new Set((input.attachmentIds ?? []).filter(Boolean)));
    if (!ids.length) return;
    await refRepo
      .createQueryBuilder()
      .update(MailAttachmentUserRefEntity)
      .set({
        messageId: input.messageId,
        countsStorage: true,
        deletedAt: null,
        permanentlyDeletedAt: null,
      })
      .where('attachment_id IN (:...ids)', { ids })
      .andWhere('user_id = :userId', { userId: input.userId })
      .execute();
  }

  async getStorageSummary(userId: string, manager?: EntityManager) {
    const [quota, usedBytes] = await Promise.all([
      this.getQuota(userId, manager),
      this.getUsage(userId, manager),
    ]);

    const remainingBytes = Math.max(0, quota.quotaBytes - usedBytes);
    const usedPercent = quota.quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quota.quotaBytes) * 10000) / 100) : 0;

    return {
      userId,
      quotaBytes: quota.quotaBytes,
      quotaGb: quota.quotaGb,
      usedBytes,
      remainingBytes,
      usedPercent,
      updatedAt: quota.updatedAt,
      updatedByUserId: quota.updatedByUserId,
    };
  }
}
