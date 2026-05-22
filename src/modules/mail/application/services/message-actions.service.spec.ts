import { ForbiddenException } from '@nestjs/common';
import { MessageActionsService } from './message-actions.service';

describe('MessageActionsService', () => {
  const baseAction = {
    id: 'action-1',
    threadId: 'thread-1',
    messageId: 'message-1',
    actionKey: 'mail:thread-1:purchase_confirmation:purchase_order:po-1',
    actionType: 'PURCHASE_CONFIRMATION',
    targetEntityType: 'purchase_order',
    targetEntityId: 'po-1',
    status: 'PENDING',
    completedByUserId: null,
    completedAt: null,
    version: 1,
    metadata: { requiredPermissions: ['purchases.approve_creation_with_payment'] },
  };

  const buildService = (options?: {
    actionStatus?: 'PENDING' | 'COMPLETED';
    allowPermissions?: boolean;
  }) => {
    const actionStatus = options?.actionStatus ?? 'PENDING';
    const allowPermissions = options?.allowPermissions ?? true;

    const actionRepoFindOne = jest.fn(async () => (actionStatus === 'COMPLETED' ? { ...baseAction, status: 'COMPLETED' } : { ...baseAction, status: 'COMPLETED', completedByUserId: 'user-2', completedAt: new Date('2026-05-20T10:00:00.000Z') }));
    const actionRecipientRepo = {
      findOne: jest.fn(async () => ({ id: 'rec-1', actionId: 'action-1', userId: 'user-1', canExecute: true })),
      find: jest.fn(async () => [{ userId: 'user-1', canExecute: true }]),
      save: jest.fn(),
      create: jest.fn(),
    };

    const rawRow = {
      id: 'action-1',
      thread_id: 'thread-1',
      message_id: 'message-1',
      action_key: 'mail:thread-1:purchase_confirmation:purchase_order:po-1',
      action_type: 'PURCHASE_CONFIRMATION',
      target_entity_type: 'purchase_order',
      target_entity_id: 'po-1',
      status: actionStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      completed_by_user_id: actionStatus === 'COMPLETED' ? 'user-2' : null,
      completed_by_name: actionStatus === 'COMPLETED' ? 'Ana' : null,
      completed_at: actionStatus === 'COMPLETED' ? '2026-05-20T10:00:00.000Z' : null,
      version: 2,
      metadata: {},
      can_execute: true,
    };

    const dataSource = {
      transaction: jest.fn(async (cb: (manager: any) => Promise<unknown>) => {
        let queryBuilderCalls = 0;
        const messageActionRepoInTx = {
          createQueryBuilder: jest.fn(() => {
            queryBuilderCalls += 1;
            if (queryBuilderCalls === 1) {
              return {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(async () =>
                  actionStatus === 'COMPLETED'
                    ? { ...baseAction, status: 'COMPLETED', completedByUserId: 'user-2', completedAt: new Date('2026-05-20T10:00:00.000Z') }
                    : { ...baseAction, status: 'PENDING' },
                ),
              };
            }
            return {
              innerJoin: jest.fn().mockReturnThis(),
              leftJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(async () => rawRow),
            };
          }),
          save: jest.fn(async (value) => value),
        };

        return cb({
          getRepository: jest.fn((entity: unknown) => {
            const entityName = (entity as { name?: string })?.name ?? '';
            if (entityName === 'MessageActionEntity') return messageActionRepoInTx;
            if (entityName === 'ApprovalRequestEntity') return { findOne: jest.fn(), save: jest.fn() };
            if (entityName === 'PurchaseOrderEntity') return { update: jest.fn() };
            if (entityName === 'PaymentDocumentEntity') return { update: jest.fn() };
            return {};
          }),
        });
      }),
    };

    const realtimeService = { emitToUser: jest.fn() };

    const service = new MessageActionsService(
      { findOne: jest.fn() } as any,
      { findOne: actionRepoFindOne, createQueryBuilder: jest.fn(), save: jest.fn(), create: jest.fn() } as any,
      actionRecipientRepo as any,
      dataSource as any,
      { userHasAllPermissions: jest.fn(async () => allowPermissions) } as any,
      { createAuditLog: jest.fn() } as any,
      realtimeService as any,
    );

    return { service, realtimeService };
  };

  it('returns ACTION_ALREADY_COMPLETED when action already completed by another user', async () => {
    const { service } = buildService({ actionStatus: 'COMPLETED' });
    const result = await service.executeAction({
      actionId: 'action-1',
      userId: 'user-1',
    });
    expect(result.code).toBe('ACTION_ALREADY_COMPLETED');
    expect(result.action.status).toBe('COMPLETED');
  });

  it('does not emit realtime update when action was already completed', async () => {
    const { service, realtimeService } = buildService({ actionStatus: 'COMPLETED' });
    const result = await service.executeAction({
      actionId: 'action-1',
      userId: 'user-1',
    });
    expect(result.code).toBe('ACTION_ALREADY_COMPLETED');
    expect(realtimeService.emitToUser).not.toHaveBeenCalled();
  });

  it('rejects execution when user does not have required permission', async () => {
    const { service } = buildService({ actionStatus: 'PENDING', allowPermissions: false });
    await expect(
      service.executeAction({
        actionId: 'action-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
