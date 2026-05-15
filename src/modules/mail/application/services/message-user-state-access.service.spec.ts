import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageUserStateAccessService } from './message-user-state-access.service';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

describe('MessageUserStateAccessService', () => {
  const buildState = (): MessageUserStateEntity => ({
    id: 'state-1',
    messageId: 'msg-1',
    threadId: 'thread-1',
    userId: 'user-1',
    relationType: 'TO',
    recipientEmail: 'user@test.com',
    isInInbox: true,
    isInSent: false,
    isArchived: false,
    isMuted: false,
    readAt: null,
    starredAt: null,
    snoozedUntil: null,
    snoozedAt: null,
    deletedAt: null,
    trashExpiresAt: null,
    permanentlyHiddenAt: null,
    deliveredAt: null,
    openedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const buildService = (opts?: {
    state?: MessageUserStateEntity | null;
    message?: { id: string; originModule: string } | null;
    canOpen?: boolean;
  }) => {
    const state = opts?.state ?? buildState();
    const message = opts?.message ?? { id: 'msg-1', originModule: 'corporate' };
    const canOpen = opts?.canOpen ?? true;

    const messageUserStateRepository = {
      findOne: jest.fn().mockImplementation(async (query: any) => {
        const where = query?.where ?? {};
        if (where.id === 'state-1' || where.messageId === 'state-1') return state;
        return null;
      }),
    };

    const messageRepository = {
      findOne: jest.fn().mockResolvedValue(message),
    };

    const accessControlPort = {
      canOpenMessage: jest.fn().mockResolvedValue(canOpen),
    };

    const service = new MessageUserStateAccessService(
      messageUserStateRepository as any,
      messageRepository as any,
      accessControlPort as any,
    );

    return { service, messageUserStateRepository, messageRepository, accessControlPort };
  };

  it('returns state when user can open message', async () => {
    const { service, accessControlPort } = buildService();
    const result = await service.findMessageStateOrThrow('user-1', 'state-1');

    expect(result.id).toBe('state-1');
    expect(accessControlPort.canOpenMessage).toHaveBeenCalled();
  });

  it('throws not found when state does not exist', async () => {
    const { service } = buildService({ state: null });
    await expect(service.findMessageStateOrThrow('user-1', 'state-404')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws forbidden when canOpenMessage denies access', async () => {
    const { service } = buildService({ canOpen: false });
    await expect(service.findMessageStateOrThrow('user-1', 'state-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
