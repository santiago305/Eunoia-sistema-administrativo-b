import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MessageAuditLogEntity } from '../../adapters/out/persistence/typeorm/entities/message-audit-log.entity';

@Injectable()
export class MessageAuditService {
  constructor(
    @InjectRepository(MessageAuditLogEntity)
    private readonly messageAuditLogRepository: Repository<MessageAuditLogEntity>,
  ) {}

  async createAuditLog(
    input: {
      action: string;
      actorUserId?: string | null;
      messageId?: string | null;
      threadId?: string | null;
      metadata?: Record<string, unknown>;
    },
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(MessageAuditLogEntity) : this.messageAuditLogRepository;
    await repo.save(
      repo.create({
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        messageId: input.messageId ?? null,
        threadId: input.threadId ?? null,
        metadata: input.metadata ?? {},
      }),
    );
  }
}
