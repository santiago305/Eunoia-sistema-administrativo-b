import { UnauthorizedException } from '@nestjs/common';
import { RefreshAuthUseCase } from './refresh.auth.usecase';

describe('RefreshAuthUseCase', () => {
  const makeUseCase = (overrides?: {
    tokenReadRepository?: { signAccessToken: jest.Mock };
  }) => {
    const tokenReadRepository = overrides?.tokenReadRepository ?? {
      signAccessToken: jest.fn(),
    };

    return new RefreshAuthUseCase(tokenReadRepository as any);
  };

  it('returns access token when payload is valid', async () => {
    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
    };

    const useCase = makeUseCase({ tokenReadRepository });

    const result = await useCase.execute({
      sub: 'user-1',
      email: 'ana@example.com',
      role: 'ADMIN',
    });

    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ana@example.com',
      role: 'ADMIN',
    });
    expect(result).toEqual({ access_token: 'access' });
  });

  it('throws when payload has no sub', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ email: 'ana@example.com', role: 'ADMIN' } as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
