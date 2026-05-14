import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

@Injectable()
export class ReleaseSnoozedMessagesJob {
  private readonly logger = new Logger(ReleaseSnoozedMessagesJob.name);

  constructor(
    @InjectRepository(MessageUserStateEntity)
    private readonly stateRepository: Repository<MessageUserStateEntity>,
  ) {}

  async run() {
    const result = await this.stateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({ snoozedUntil: null, snoozedAt: null, isInInbox: true })
      .where('snoozed_until IS NOT NULL')
      .andWhere('snoozed_until <= now()')
      .andWhere('deleted_at IS NULL')
      .execute();

    this.logger.debug(`release-snoozed-messages updated=${result.affected ?? 0}`);
    return { updated: result.affected ?? 0 };
  }
}
