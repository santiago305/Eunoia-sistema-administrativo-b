import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';

@Injectable()
export class CleanOrphanAttachmentsJob {
  private readonly logger = new Logger(CleanOrphanAttachmentsJob.name);

  constructor(
    @InjectRepository(MessageAttachmentEntity)
    private readonly attachmentRepository: Repository<MessageAttachmentEntity>,
  ) {}

  async run() {
    // Safety window: do not delete very recent uploads that might still be linking.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.attachmentRepository
      .createQueryBuilder()
      .delete()
      .where('message_id IS NULL')
      .andWhere('draft_id IS NULL')
      .andWhere('created_at <= :cutoff', { cutoff })
      .execute();

    this.logger.debug(`clean-orphan-attachments deleted=${result.affected ?? 0}`);
    return { deleted: result.affected ?? 0 };
  }
}
