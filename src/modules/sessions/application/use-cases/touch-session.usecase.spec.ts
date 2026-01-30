import { UnauthorizedException } from '@nestjs/common';
import { TouchSessionUseCase } from './touch-session.usecase';

describe('TouchSessionUseCase', () => {
  const makeUseCase = (overrides?: { sessionRepository?: any }) => {
    const sessionRepository = overrides?.sessionRepository ?? {
      findById: jest.fn(),
      updateLastSeen: jest.fn(),
    };
    return new TouchSessionUseCase(sessionRepository);
  };

  it('updates lastSeenAt', async () => {
    const now = new Date('2026-01-10T00:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      }),
      updateLastSeen: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ sessionRepository });

    const result = await useCase.execute('s1', 'user-1');

    expect(result).toEqual({ lastSeenAt: now });
    expect(sessionRepository.updateLastSeen).toHaveBeenCalledWith('s1', now);

    jest.useRealTimers();
  });

  it('throws when session does not exist', async () => {
    const useCase = makeUseCase({
      sessionRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('s1', 'user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when session belongs to another user', async () => {
    const useCase = makeUseCase({
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'user-2', revokedAt: null }),
      },
    });

    await expect(useCase.execute('s1', 'user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when session is revoked', async () => {
    const useCase = makeUseCase({
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'user-1', revokedAt: new Date() }),
      },
    });

    await expect(useCase.execute('s1', 'user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when session is expired', async () => {
    const now = new Date('2026-01-10T00:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const useCase = makeUseCase({
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 's1',
          userId: 'user-1',
          revokedAt: null,
          expiresAt: new Date('2026-01-01T00:00:00Z'),
        }),
      },
    });

    await expect(useCase.execute('s1', 'user-1')).rejects.toBeInstanceOf(UnauthorizedException);

    jest.useRealTimers();
  });
});
