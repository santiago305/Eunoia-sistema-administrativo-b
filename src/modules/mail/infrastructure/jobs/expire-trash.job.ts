import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

@Injectable()
export class ExpireTrashJob {
  private readonly logger = new Logger(ExpireTrashJob.name);

  constructor(
    @InjectRepository(MessageUserStateEntity)
    private readonly stateRepository: Repository<MessageUserStateEntity>,
  ) {}

  async run() {
    const result = await this.stateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({ permanentlyHiddenAt: new Date() })
      .where('deleted_at IS NOT NULL')
      .andWhere('trash_expires_at IS NOT NULL')
      .andWhere('trash_expires_at <= now()')
      .andWhere('permanently_hidden_at IS NULL')
      .execute();

    this.logger.debug(`expire-trash updated=${result.affected ?? 0}`);
    return { updated: result.affected ?? 0 };
  }
}
