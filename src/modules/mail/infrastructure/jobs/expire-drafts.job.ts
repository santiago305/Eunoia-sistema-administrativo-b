import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';

@Injectable()
export class ExpireDraftsJob {
  private readonly logger = new Logger(ExpireDraftsJob.name);

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async run() {
    const now = new Date();
    const result = await this.messageRepository
      .createQueryBuilder()
      .update(MessageEntity)
      .set({ isDraft: false, draftExpiresAt: null, updatedAt: now })
      .where('is_draft = true')
      .andWhere("status = 'DRAFT'")
      .andWhere('draft_expires_at IS NOT NULL')
      .andWhere('draft_expires_at <= now()')
      .execute();

    this.logger.debug(`expire-drafts updated=${result.affected ?? 0}`);
    return { updated: result.affected ?? 0 };
  }
}
