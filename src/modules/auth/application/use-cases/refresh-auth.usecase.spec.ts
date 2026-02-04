import { UnauthorizedException } from '@nestjs/common';
import { RefreshAuthUseCase } from './refresh.auth.usecase';

describe('RefreshAuthUseCase', () => {
  const makeUseCase = (overrides?: {
    tokenReadRepository?: { signAccessToken: jest.Mock; signRefreshToken: jest.Mock };
  }) => {
    const tokenReadRepository = overrides?.tokenReadRepository ?? {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };

    return new RefreshAuthUseCase(tokenReadRepository as any);
  };

  it('returns tokens when payload is valid', async () => {
    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
      signRefreshToken: jest.fn().mockReturnValue('refresh'),
    };

    const useCase = makeUseCase({ tokenReadRepository });

    const result = await useCase.execute({
      user: { sub: 'user-1', role: 'ADMIN' },
    });

    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: 'ADMIN',
    });
    expect(tokenReadRepository.signRefreshToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: 'ADMIN',
    });
    expect(result).toEqual({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('throws when payload has no sub', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ user: { role: 'ADMIN' } } as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
