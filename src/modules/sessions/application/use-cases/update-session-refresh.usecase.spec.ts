import { UnauthorizedException } from '@nestjs/common';
import { UpdateSessionRefreshUseCase } from './update-session-refresh.usecase';

describe('UpdateSessionRefreshUseCase', () => {
  const makeUseCase = (overrides?: { sessionRepository?: any }) => {
    const sessionRepository = overrides?.sessionRepository ?? {
      findById: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
    };
    return new UpdateSessionRefreshUseCase(sessionRepository);
  };

  it('rotates refresh token', async () => {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        revokedAt: null,
      }),
      updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ sessionRepository });

    const result = await useCase.execute(
      's1',
      'hash',
      new Date('2026-02-01T00:00:00Z'),
      'user-1'
    );

    expect(result).toEqual({ rotated: true });
    expect(sessionRepository.updateRefreshTokenHash).toHaveBeenCalled();
  });

  it('throws when session does not exist', async () => {
    const useCase = makeUseCase({
      sessionRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('s1', 'hash', new Date('2026-02-01T00:00:00Z'))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when session belongs to another user', async () => {
    const useCase = makeUseCase({
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'user-2', revokedAt: null }),
      },
    });

    await expect(
      useCase.execute('s1', 'hash', new Date('2026-02-01T00:00:00Z'), 'user-1')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when session is revoked', async () => {
    const useCase = makeUseCase({
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'user-1', revokedAt: new Date() }),
      },
    });

    await expect(
      useCase.execute('s1', 'hash', new Date('2026-02-01T00:00:00Z'))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when refresh token hash is invalid', async () => {
    const useCase = makeUseCase({
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'user-1', revokedAt: null }),
      },
    });

    await expect(
      useCase.execute('s1', '  ', new Date('2026-02-01T00:00:00Z'))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
