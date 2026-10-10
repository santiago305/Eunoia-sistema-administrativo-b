import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageAuditLogEntity } from '../../adapters/out/persistence/typeorm/entities/message-audit-log.entity';

@Injectable()
export class ExpireDraftsJob {
  private readonly logger = new Logger(ExpireDraftsJob.name);

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageAuditLogEntity)
    private readonly auditRepository: Repository<MessageAuditLogEntity>,
  ) {}

  async run() {
    const now = new Date();
    const expiredDrafts = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.id', 'id')
      .where('message.is_draft = true')
      .andWhere("message.status = 'DRAFT'")
      .andWhere('message.draft_expires_at IS NOT NULL')
      .andWhere('message.draft_expires_at <= :now', { now })
      .getRawMany<{ id: string }>();

    if (!expiredDrafts.length) {
      this.logger.debug('expire-drafts updated=0');
      return { updated: 0 };
    }

    const ids = expiredDrafts.map(({ id }) => id).filter(Boolean);
    const result = await this.messageRepository
      .createQueryBuilder()
      .update(MessageEntity)
      .set({ isDraft: false, draftExpiresAt: null, updatedAt: now })
      .where('id IN (:...ids)', { ids })
      .andWhere('is_draft = true')
      .andWhere("status = 'DRAFT'")
      .execute();

    await this.auditRepository.insert(
      ids.map((messageId) => ({
        messageId,
        threadId: null,
        actorUserId: null,
        action: 'DRAFT_EXPIRED',
        metadata: { expiredAt: now.toISOString(), retentionManagedBy: 'mail-jobs' },
      })),
    );

    this.logger.debug(`expire-drafts updated=${result.affected ?? 0}`);
    return { updated: result.affected ?? 0 };
  }
}
