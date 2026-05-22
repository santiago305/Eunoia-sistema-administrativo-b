import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { PaymentDocumentEntity } from 'src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity';
import { ApprovalRequestEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity';
import { PurchaseOrderEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
import { MessageActionEntity } from '../../adapters/out/persistence/typeorm/entities/message-action.entity';
import { MessageActionRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-action-recipient.entity';
import { MessageAuditService } from './message-audit.service';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';

type ActionSeed = {
  actionKey?: string;
  actionType?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  canExecuteUserIds?: string[];
  requiredPermissions?: string[];
  metadata?: Record<string, unknown>;
};

@Injectable()
export class MessageActionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageActionEntity)
    private readonly messageActionRepository: Repository<MessageActionEntity>,
    @InjectRepository(MessageActionRecipientEntity)
    private readonly messageActionRecipientRepository: Repository<MessageActionRecipientEntity>,
    private readonly dataSource: DataSource,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
    private readonly messageAuditService: MessageAuditService,
    private readonly realtimeService: NotificationRealtimeService,
  ) {}

  private toBoolean(value: unknown) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === 't' || normalized === '1';
    }
    return false;
  }

  private sanitizeActionSeed(value: unknown): ActionSeed | null {
    if (!value || typeof value !== 'object') return null;
    const action = value as Record<string, unknown>;
    const actionType = typeof action.actionType === 'string' ? action.actionType.trim().toUpperCase() : '';
    const targetEntityType = typeof action.targetEntityType === 'string' ? action.targetEntityType.trim() : '';
    const targetEntityId = typeof action.targetEntityId === 'string' ? action.targetEntityId.trim() : '';
    if (!actionType || !targetEntityType || !targetEntityId) return null;
    const actionKey =
      typeof action.actionKey === 'string' && action.actionKey.trim().length > 0
        ? action.actionKey.trim()
        : undefined;
    const canExecuteUserIds = Array.isArray(action.canExecuteUserIds)
      ? action.canExecuteUserIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined;
    const requiredPermissions = Array.isArray(action.requiredPermissions)
      ? action.requiredPermissions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined;
    const metadata =
      action.metadata && typeof action.metadata === 'object' && !Array.isArray(action.metadata)
        ? (action.metadata as Record<string, unknown>)
        : {};
    return {
      actionKey,
      actionType,
      targetEntityType,
      targetEntityId,
      canExecuteUserIds,
      requiredPermissions,
      metadata,
    };
  }

  private buildDefaultActionKey(input: { threadId: string; actionType: string; targetEntityType: string; targetEntityId: string }) {
    const { threadId, actionType, targetEntityType, targetEntityId } = input;
    return `mail:${threadId}:${actionType}:${targetEntityType}:${targetEntityId}`.toLowerCase();
  }

  async createActionsForSystemMessage(input: {
    threadId: string;
    messageId: string;
    recipientUserIds: string[];
    actionsRaw: unknown;
  }) {
    const actionCandidates = Array.isArray(input.actionsRaw) ? input.actionsRaw : [];
    const actionSeeds = actionCandidates
      .map((raw) => this.sanitizeActionSeed(raw))
      .filter((seed): seed is ActionSeed => Boolean(seed));
    if (!actionSeeds.length) return [];

    const uniqueRecipientIds = Array.from(new Set(input.recipientUserIds.filter(Boolean)));
    if (!uniqueRecipientIds.length) return [];

    const createdActions: MessageActionEntity[] = [];
    for (const seed of actionSeeds) {
      const actionKey =
        seed.actionKey ??
        this.buildDefaultActionKey({
          threadId: input.threadId,
          actionType: seed.actionType!,
          targetEntityType: seed.targetEntityType!,
          targetEntityId: seed.targetEntityId!,
        });
      const existing = await this.messageActionRepository.findOne({
        where: { actionKey },
      });
      if (existing) continue;

      const action = await this.messageActionRepository.save(
        this.messageActionRepository.create({
          threadId: input.threadId,
          messageId: input.messageId,
          actionKey,
          actionType: seed.actionType!,
          targetEntityType: seed.targetEntityType!,
          targetEntityId: seed.targetEntityId!,
          status: 'PENDING',
          metadata: {
            ...(seed.metadata ?? {}),
            requiredPermissions: seed.requiredPermissions ?? [],
          },
        }),
      );
      createdActions.push(action);
      const canExecuteSet = new Set(seed.canExecuteUserIds ?? uniqueRecipientIds);
      await this.messageActionRecipientRepository.save(
        uniqueRecipientIds.map((userId) =>
          this.messageActionRecipientRepository.create({
            actionId: action.id,
            userId,
            canExecute: canExecuteSet.has(userId),
          }),
        ),
      );
    }
    return createdActions;
  }

  async listActionsForUser(
    userId: string,
    query: { threadId?: string; messageId?: string } = {},
  ) {
    const qb = this.messageActionRepository
      .createQueryBuilder('mma')
      .innerJoin(
        MessageActionRecipientEntity,
        'mmar',
        'mmar.action_id = mma.id AND mmar.user_id = :userId',
        { userId },
      )
      .leftJoin(User, 'completed_by', 'completed_by.user_id = mma.completed_by_user_id')
      .select([
        'mma.id AS id',
        'mma.thread_id AS thread_id',
        'mma.message_id AS message_id',
        'mma.action_key AS action_key',
        'mma.action_type AS action_type',
        'mma.target_entity_type AS target_entity_type',
        'mma.target_entity_id AS target_entity_id',
        'mma.status AS status',
        'mma.completed_by_user_id AS completed_by_user_id',
        'mma.completed_at AS completed_at',
        'mma.version AS version',
        'mma.metadata AS metadata',
        'mmar.can_execute AS can_execute',
        'completed_by.name AS completed_by_name',
      ])
      .orderBy('mma.created_at', 'ASC');

    if (query.threadId) qb.andWhere('mma.thread_id = :threadId', { threadId: query.threadId });
    if (query.messageId) qb.andWhere('mma.message_id = :messageId', { messageId: query.messageId });

    const rows = await qb.getRawMany<{
      id: string;
      thread_id: string;
      message_id: string | null;
      action_key: string;
      action_type: string;
      target_entity_type: string;
      target_entity_id: string;
      status: string;
      completed_by_user_id: string | null;
      completed_by_name: string | null;
      completed_at: Date | string | null;
      version: number;
      metadata: Record<string, unknown> | null;
      can_execute: boolean;
    }>();

    return rows.map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      messageId: row.message_id,
      actionKey: row.action_key,
      actionType: row.action_type,
      targetEntityType: row.target_entity_type,
      targetEntityId: row.target_entity_id,
      status: row.status,
      completedByUserId: row.completed_by_user_id,
      completedByName: row.completed_by_name,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      version: row.version,
      metadata: row.metadata ?? {},
      canExecute: this.toBoolean(row.can_execute) && row.status === 'PENDING',
    }));
  }

  async executeAction(input: { actionId: string; userId: string; comment?: string }) {
    const recipient = await this.messageActionRecipientRepository.findOne({
      where: { actionId: input.actionId, userId: input.userId },
    });
    if (!recipient || !recipient.canExecute) {
      throw new ForbiddenException('MAIL_ACTION_EXECUTION_DENIED');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const action = await manager
        .getRepository(MessageActionEntity)
        .createQueryBuilder('mma')
        .setLock('pessimistic_write')
        .where('mma.id = :actionId', { actionId: input.actionId })
        .getOne();

      if (!action) throw new NotFoundException('MAIL_ACTION_NOT_FOUND');

      if (action.status !== 'PENDING') {
        return {
          code: 'ACTION_ALREADY_COMPLETED' as const,
          action: await this.serializeActionForUser(manager, action.id, input.userId),
        };
      }

      const requiredPermissions = Array.isArray(action.metadata?.requiredPermissions)
        ? action.metadata.requiredPermissions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
      const allowed = await this.accessControlPort.userHasAllPermissions(input.userId, requiredPermissions);
      if (!allowed) {
        throw new ForbiddenException('MAIL_ACTION_EXECUTION_DENIED');
      }

      await this.executeTargetActionInTx(manager, action, input.userId);

      action.status = 'COMPLETED';
      action.completedByUserId = input.userId;
      action.completedAt = new Date();
      action.version = Number(action.version ?? 1) + 1;
      action.metadata = {
        ...(action.metadata ?? {}),
        lastExecutionComment: input.comment ?? null,
      };
      await manager.getRepository(MessageActionEntity).save(action);

      await this.messageAuditService.createAuditLog(
        {
          action: 'MAIL_ACTION_COMPLETED',
          actorUserId: input.userId,
          messageId: action.messageId,
          threadId: action.threadId,
          metadata: {
            actionId: action.id,
            actionType: action.actionType,
            targetEntityType: action.targetEntityType,
            targetEntityId: action.targetEntityId,
          },
        },
        manager,
      );

      return {
        code: 'ACTION_COMPLETED' as const,
        action: await this.serializeActionForUser(manager, action.id, input.userId),
      };
    });

    if (result.code === 'ACTION_COMPLETED') {
      await this.emitActionUpdated(input.actionId);
    }
    return result;
  }

  async listThreadActionsForMessages(
    userId: string,
    input: { threadId?: string | null; messageIds: string[] },
  ) {
    if (!input.messageIds.length && !input.threadId) return [];
    const qb = this.messageActionRepository
      .createQueryBuilder('mma')
      .innerJoin(
        MessageActionRecipientEntity,
        'mmar',
        'mmar.action_id = mma.id AND mmar.user_id = :userId',
        { userId },
      )
      .leftJoin(User, 'completed_by', 'completed_by.user_id = mma.completed_by_user_id')
      .where('mma.message_id IN (:...messageIds)', { messageIds: input.messageIds });

    if (input.threadId) {
      qb.orWhere('(mma.thread_id = :threadId AND mma.message_id IS NULL)', { threadId: input.threadId });
    }

    const rows = await qb
      .select([
        'mma.id AS id',
        'mma.thread_id AS thread_id',
        'mma.message_id AS message_id',
        'mma.action_key AS action_key',
        'mma.action_type AS action_type',
        'mma.target_entity_type AS target_entity_type',
        'mma.target_entity_id AS target_entity_id',
        'mma.status AS status',
        'mma.completed_by_user_id AS completed_by_user_id',
        'mma.completed_at AS completed_at',
        'mma.version AS version',
        'mma.metadata AS metadata',
        'mmar.can_execute AS can_execute',
        'completed_by.name AS completed_by_name',
      ])
      .orderBy('mma.created_at', 'ASC')
      .getRawMany<{
        id: string;
        thread_id: string;
        message_id: string | null;
        action_key: string;
        action_type: string;
        target_entity_type: string;
        target_entity_id: string;
        status: string;
        completed_by_user_id: string | null;
        completed_by_name: string | null;
        completed_at: Date | string | null;
        version: number;
        metadata: Record<string, unknown> | null;
        can_execute: boolean;
      }>();

    return rows.map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      messageId: row.message_id,
      actionKey: row.action_key,
      actionType: row.action_type,
      targetEntityType: row.target_entity_type,
      targetEntityId: row.target_entity_id,
      status: row.status,
      completedByUserId: row.completed_by_user_id,
      completedByName: row.completed_by_name,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      version: row.version,
      metadata: row.metadata ?? {},
      canExecute: this.toBoolean(row.can_execute) && row.status === 'PENDING',
    }));
  }

  private async serializeActionForUser(manager: EntityManager, actionId: string, userId: string) {
    const row = await manager
      .getRepository(MessageActionEntity)
      .createQueryBuilder('mma')
      .innerJoin(
        MessageActionRecipientEntity,
        'mmar',
        'mmar.action_id = mma.id AND mmar.user_id = :userId',
        { userId },
      )
      .leftJoin(User, 'completed_by', 'completed_by.user_id = mma.completed_by_user_id')
      .select([
        'mma.id AS id',
        'mma.thread_id AS thread_id',
        'mma.message_id AS message_id',
        'mma.action_key AS action_key',
        'mma.action_type AS action_type',
        'mma.target_entity_type AS target_entity_type',
        'mma.target_entity_id AS target_entity_id',
        'mma.status AS status',
        'mma.completed_by_user_id AS completed_by_user_id',
        'mma.completed_at AS completed_at',
        'mma.version AS version',
        'mma.metadata AS metadata',
        'mmar.can_execute AS can_execute',
        'completed_by.name AS completed_by_name',
      ])
      .where('mma.id = :actionId', { actionId })
      .getRawOne<{
        id: string;
        thread_id: string;
        message_id: string | null;
        action_key: string;
        action_type: string;
        target_entity_type: string;
        target_entity_id: string;
        status: string;
        completed_by_user_id: string | null;
        completed_by_name: string | null;
        completed_at: Date | string | null;
        version: number;
        metadata: Record<string, unknown> | null;
        can_execute: boolean;
      }>();

    if (!row) throw new NotFoundException('MAIL_ACTION_NOT_FOUND');
    return {
      id: row.id,
      threadId: row.thread_id,
      messageId: row.message_id,
      actionKey: row.action_key,
      actionType: row.action_type,
      targetEntityType: row.target_entity_type,
      targetEntityId: row.target_entity_id,
      status: row.status,
      completedByUserId: row.completed_by_user_id,
      completedByName: row.completed_by_name,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      version: row.version,
      metadata: row.metadata ?? {},
      canExecute: this.toBoolean(row.can_execute) && row.status === 'PENDING',
    };
  }

  private async executeTargetActionInTx(manager: EntityManager, action: MessageActionEntity, userId: string) {
    if (action.actionType === 'PURCHASE_CONFIRMATION') {
      await this.executePurchaseConfirmationInTx(manager, action, userId);
      return;
    }
    throw new BadRequestException('MAIL_ACTION_TYPE_NOT_SUPPORTED');
  }

  private async executePurchaseConfirmationInTx(manager: EntityManager, action: MessageActionEntity, userId: string) {
    const targetEntityId = action.targetEntityId;
    const approvalRepo = manager.getRepository(ApprovalRequestEntity);
    const purchaseRepo = manager.getRepository(PurchaseOrderEntity);
    const paymentDocRepo = manager.getRepository(PaymentDocumentEntity);
    const approvalRequest = await approvalRepo.findOne({
      where: {
        entityId: targetEntityId,
        entityType: 'purchase_order',
        action: 'PURCHASE_CREATION_WITH_PAYMENT',
        status: 'PENDING',
      },
      order: { createdAt: 'DESC' },
    });

    if (!approvalRequest) {
      throw new BadRequestException('MAIL_ACTION_TARGET_UNAVAILABLE');
    }

    await paymentDocRepo.update(
      { poId: targetEntityId, status: 'PENDING_APPROVAL' },
      {
        status: 'APPROVED',
        approvedByUserId: userId,
        approvedAt: new Date(),
      },
    );
    await purchaseRepo.update({ id: targetEntityId }, { approvalStatus: 'APPROVED' });
    approvalRequest.status = 'APPROVED';
    approvalRequest.reviewedByUserId = userId;
    approvalRequest.reviewedAt = new Date();
    await approvalRepo.save(approvalRequest);
  }

  private async emitActionUpdated(actionId: string) {
    const action = await this.messageActionRepository.findOne({ where: { id: actionId } });
    if (!action) return;
    const recipients = await this.messageActionRecipientRepository.find({ where: { actionId } });
    const completedBy = action.completedByUserId
      ? await this.userRepository.findOne({
          where: { id: action.completedByUserId },
          select: ['id', 'name'],
        })
      : null;

    recipients.forEach((recipient) => {
      this.realtimeService.emitToUser(recipient.userId, 'mail.action.updated', {
        actionId: action.id,
        threadId: action.threadId,
        messageId: action.messageId,
        actionType: action.actionType,
        actionKey: action.actionKey,
        targetEntityType: action.targetEntityType,
        targetEntityId: action.targetEntityId,
        status: action.status,
        completedByUserId: action.completedByUserId,
        completedByName: completedBy?.name ?? null,
        completedAt: action.completedAt ? action.completedAt.toISOString() : null,
        version: action.version,
        metadata: action.metadata ?? {},
        canExecute: recipient.canExecute && action.status === 'PENDING',
      });
    });
  }
}
