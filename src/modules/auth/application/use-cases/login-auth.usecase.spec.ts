import { UnauthorizedException } from '@nestjs/common';
import { LoginAuthUseCase } from './login-auth.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('LoginAuthUseCase', () => {
  const makeUseCase = (overrides?: {
    getUserWithPasswordByEmailUseCase?: { execute: jest.Mock };
    userRepository?: { updateSecurityById: jest.Mock };
    tokenReadRepository?: {
      signAccessToken: jest.Mock;
      signRefreshToken: jest.Mock;
    };
    passwordHasher?: { verify: jest.Mock };
    createSessionUseCase?: { execute: jest.Mock };
  }) => {
    const getUserWithPasswordByEmailUseCase =
      overrides?.getUserWithPasswordByEmailUseCase ?? {
        execute: jest.fn(),
      };

    const userRepository = overrides?.userRepository ?? {
      updateSecurityById: jest.fn().mockResolvedValue(undefined),
    };

    const tokenReadRepository = overrides?.tokenReadRepository ?? {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };

    const passwordHasher = overrides?.passwordHasher ?? {
      verify: jest.fn(),
    };

    const createSessionUseCase = overrides?.createSessionUseCase ?? {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    return new LoginAuthUseCase(
      getUserWithPasswordByEmailUseCase as any,
      userRepository as any,
      tokenReadRepository as any,
      passwordHasher as any,
      createSessionUseCase as any,
    );
  };

  it('returns tokens for valid credentials', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
      password: 'hashed',
      role: { description: RoleType.ADMIN },
    };
    const getUserWithPasswordByEmailUseCase = {
      execute: jest.fn().mockResolvedValue(user),
    };
    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
      signRefreshToken: jest.fn().mockReturnValue('refresh'),
    };
    const passwordHasher = {
      verify: jest.fn().mockResolvedValue(true),
    };

    const createSessionUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = makeUseCase({
      getUserWithPasswordByEmailUseCase,
      tokenReadRepository,
      passwordHasher,
      createSessionUseCase,
    });

    const result = await useCase.execute({
      dto: { email: 'ana@example.com', password: 'secret' },
    } as any);

    expect(passwordHasher.verify).toHaveBeenCalledWith('hashed', 'secret');
    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: RoleType.ADMIN,
      sessionId: expect.any(String),
    });
    expect(tokenReadRepository.signRefreshToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: RoleType.ADMIN,
      sessionId: expect.any(String),
    });
    expect(result).toEqual({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('uses default role when user has no role', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
      password: 'hashed',
    };
    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
      signRefreshToken: jest.fn().mockReturnValue('refresh'),
    };
    const useCase = makeUseCase({
      getUserWithPasswordByEmailUseCase: {
        execute: jest.fn().mockResolvedValue(user),
      },
      tokenReadRepository,
      passwordHasher: { verify: jest.fn().mockResolvedValue(true) },
    });

    await useCase.execute({ dto: { email: 'ana@example.com', password: 'secret' } } as any);

    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      role: RoleType.ADVISER,
      sessionId: expect.any(String),
    });
  });

  it('throws when user is not found', async () => {
    const useCase = makeUseCase({
      getUserWithPasswordByEmailUseCase: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute({ dto: { email: 'ana@example.com', password: 'secret' } } as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when password is invalid', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
      password: 'hashed',
    };
    const tokenReadRepository = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };
    const useCase = makeUseCase({
      getUserWithPasswordByEmailUseCase: {
        execute: jest.fn().mockResolvedValue(user),
      },
      tokenReadRepository,
      passwordHasher: { verify: jest.fn().mockResolvedValue(false) },
    });

    await expect(
      useCase.execute({ dto: { email: 'ana@example.com', password: 'bad' } } as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenReadRepository.signAccessToken).not.toHaveBeenCalled();
    expect(tokenReadRepository.signRefreshToken).not.toHaveBeenCalled();
  });
});
