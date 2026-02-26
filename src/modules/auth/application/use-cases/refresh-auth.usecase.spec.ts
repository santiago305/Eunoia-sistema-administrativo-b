import { UnauthorizedException } from '@nestjs/common';
import { RefreshAuthUseCase } from './refresh.auth.usecase';

describe('RefreshAuthUseCase', () => {
  const makeUseCase = (overrides?: {
    tokenReadRepository?: { signAccessToken: jest.Mock; signRefreshToken: jest.Mock };
    sessionReadRepository?: { findByIdAndUserId: jest.Mock };
    sessionRepository?: { updateUsage: jest.Mock; revokeById: jest.Mock };
    tokenHasher?: { verify: jest.Mock; hash: jest.Mock };
  }) => {
    const tokenReadRepository = overrides?.tokenReadRepository ?? {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };

    const sessionReadRepository = overrides?.sessionReadRepository ?? {
      findByIdAndUserId: jest.fn(),
    };

    const sessionRepository = overrides?.sessionRepository ?? {
      revokeById: jest.fn().mockResolvedValue(true),
      updateUsage: jest.fn().mockResolvedValue(undefined),
    };

    const tokenHasher = overrides?.tokenHasher ?? {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('hashed-refresh'),
    };

    return new RefreshAuthUseCase(
      tokenReadRepository as any,
      sessionReadRepository as any,
      sessionRepository as any,
      tokenHasher as any,
    );
  };

  it('returns tokens when payload is valid', async () => {
    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
      signRefreshToken: jest.fn().mockReturnValue('refresh'),
    };
    const sessionReadRepository = {
      findByIdAndUserId: jest.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed-old',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    };
    const sessionRepository = {
      revokeById: jest.fn().mockResolvedValue(true),
      updateUsage: jest.fn().mockResolvedValue(undefined),
    };
    const tokenHasher = {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('hashed-refresh'),
    };

    const useCase = makeUseCase({
      tokenReadRepository,
      sessionReadRepository,
      sessionRepository,
      tokenHasher,
    });

    const result = await useCase.execute({
      user: { sub: 'user-1', role: 'ADMIN', sessionId: 'session-1' } as any,
      refreshToken: 'refresh-old',
    });

    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: 'ADMIN',
      sessionId: 'session-1',
    });
    expect(tokenReadRepository.signRefreshToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: 'ADMIN',
      sessionId: 'session-1',
    });
    expect(result).toEqual({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('revokes session and throws when refresh token hash does not match', async () => {
    const sessionReadRepository = {
      findByIdAndUserId: jest.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed-old',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    };
    const sessionRepository = {
      revokeById: jest.fn().mockResolvedValue(true),
      updateUsage: jest.fn().mockResolvedValue(undefined),
    };
    const tokenHasher = {
      verify: jest.fn().mockResolvedValue(false),
      hash: jest.fn(),
    };

    const useCase = makeUseCase({
      sessionReadRepository,
      sessionRepository,
      tokenHasher,
    });

    await expect(
      useCase.execute({
        user: { sub: 'user-1', role: 'ADMIN', sessionId: 'session-1' } as any,
        refreshToken: 'stolen-or-old-token',
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionRepository.revokeById).toHaveBeenCalledWith('session-1', 'user-1');
    expect(sessionRepository.updateUsage).not.toHaveBeenCalled();
  });

  it('throws when payload has no sub', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ user: { role: 'ADMIN' }, refreshToken: 'x' } as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
