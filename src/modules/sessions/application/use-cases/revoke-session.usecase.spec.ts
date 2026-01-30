import { UnauthorizedException } from '@nestjs/common';
import { RevokeSessionUseCase } from './revoke-session.usecase';

describe('RevokeSessionUseCase', () => {
  const makeUseCase = (overrides?: { sessionRepository?: any }) => {
    const sessionRepository = overrides?.sessionRepository ?? {
      findById: jest.fn(),
      revoke: jest.fn(),
    };
    return new RevokeSessionUseCase(sessionRepository);
  };

  it('revokes a session', async () => {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        revokedAt: null,
      }),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ sessionRepository });

    const result = await useCase.execute('s1', 'user-1');

    expect(result).toEqual({ revoked: true });
    expect(sessionRepository.revoke).toHaveBeenCalled();
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

  it('does nothing when already revoked', async () => {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'user-1', revokedAt: new Date() }),
      revoke: jest.fn(),
    };
    const useCase = makeUseCase({ sessionRepository });

    const result = await useCase.execute('s1', 'user-1');

    expect(result).toEqual({ revoked: true });
    expect(sessionRepository.revoke).not.toHaveBeenCalled();
  });
});
