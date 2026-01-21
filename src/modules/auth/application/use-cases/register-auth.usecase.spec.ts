import { UnauthorizedException } from '@nestjs/common';
import { RegisterAuthUseCase } from './register-auth.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('RegisterAuthUseCase', () => {
  const makeUseCase = (overrides?: {
    createUserUseCase?: { execute: jest.Mock };
    getUserWithPasswordByEmailUseCase?: { execute: jest.Mock };
    tokenReadRepository?: {
      signAccessToken: jest.Mock;
      signRefreshToken: jest.Mock;
    };
  }) => {
    const createUserUseCase = overrides?.createUserUseCase ?? {
      execute: jest.fn(),
    };

    const getUserWithPasswordByEmailUseCase =
      overrides?.getUserWithPasswordByEmailUseCase ?? {
        execute: jest.fn(),
      };

    const tokenReadRepository = overrides?.tokenReadRepository ?? {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };

    return new RegisterAuthUseCase(
      createUserUseCase as any,
      getUserWithPasswordByEmailUseCase as any,
      tokenReadRepository as any,
    );
  };

  it('registers user and returns tokens', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
      role: { description: RoleType.ADMIN },
    };

    const createUserUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const getUserWithPasswordByEmailUseCase = {
      execute: jest.fn().mockResolvedValue(user),
    };
    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
      signRefreshToken: jest.fn().mockReturnValue('refresh'),
    };

    const useCase = makeUseCase({
      createUserUseCase,
      getUserWithPasswordByEmailUseCase,
      tokenReadRepository,
    });

    const result = await useCase.execute({
      email: 'ana@example.com',
      password: 'secret',
      name: 'Ana',
    } as any);

    expect(createUserUseCase.execute).toHaveBeenCalledWith(
      expect.any(Object),
      RoleType.ADVISER
    );
    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ana@example.com',
      role: RoleType.ADMIN,
    });
    expect(tokenReadRepository.signRefreshToken).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ana@example.com',
      role: RoleType.ADMIN,
    });
    expect(result).toEqual({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('uses default role when user has no role', async () => {
    const user = {
      id: 'user-1',
      email: 'ana@example.com',
    };

    const tokenReadRepository = {
      signAccessToken: jest.fn().mockReturnValue('access'),
      signRefreshToken: jest.fn().mockReturnValue('refresh'),
    };

    const useCase = makeUseCase({
      createUserUseCase: { execute: jest.fn().mockResolvedValue(undefined) },
      getUserWithPasswordByEmailUseCase: {
        execute: jest.fn().mockResolvedValue(user),
      },
      tokenReadRepository,
    });

    await useCase.execute({
      email: 'ana@example.com',
      password: 'secret',
      name: 'Ana',
    } as any);

    expect(tokenReadRepository.signAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ana@example.com',
      role: RoleType.ADVISER,
    });
  });

  it('throws when created user cannot be loaded', async () => {
    const useCase = makeUseCase({
      createUserUseCase: { execute: jest.fn().mockResolvedValue(undefined) },
      getUserWithPasswordByEmailUseCase: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute({
        email: 'ana@example.com',
        password: 'secret',
        name: 'Ana',
      } as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
