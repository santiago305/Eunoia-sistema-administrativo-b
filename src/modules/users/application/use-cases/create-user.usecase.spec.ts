import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { CreateUserUseCase } from './create-user.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { Email } from 'src/modules/users/domain';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('CreateUserUseCase', () => {
  const makeUseCase = (overrides?: {
    userRepository?: any;
    rolesService?: any;
  }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue({}),
    };
    const rolesService = overrides?.rolesService ?? {
      isRoleActive: jest.fn(),
      findOne: jest.fn(),
      findOneDescription: jest.fn(),
    };

    return new CreateUserUseCase(userRepository, rolesService);
  };

  it('creates user for admin', async () => {
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');
    const rolesService = {
      isRoleActive: jest.fn(),
      findOne: jest.fn(),
      findOneDescription: jest.fn().mockResolvedValue({
        data: { id: 'role-1', description: RoleType.ADVISER },
      }),
    };
    const userRepository = {
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue({}),
    };
    const useCase = makeUseCase({ userRepository, rolesService });

    const result = await useCase.execute(
      {
        name: 'Ana',
        email: 'ana@example.com',
        password: 'secret',
      } as any,
      RoleType.ADMIN
    );

    expect(userRepository.existsByEmail).toHaveBeenCalledWith(new Email('ana@example.com'));
    expect(userRepository.save).toHaveBeenCalled();
    expect(result).toEqual(successResponse('Usuario creado correctamente'));
  });

  it('rejects non admin/moderator', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ email: 'ana@example.com' } as any, RoleType.ADVISER)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects duplicate email', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByEmail: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(
      useCase.execute({ email: 'ana@example.com' } as any, RoleType.ADMIN)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects moderator creating non adviser', async () => {
    const rolesService = {
      isRoleActive: jest.fn(),
      findOne: jest.fn().mockResolvedValue({
        data: { id: 'role-1', description: RoleType.ADMIN },
      }),
      findOneDescription: jest.fn(),
    };
    const useCase = makeUseCase({ rolesService });

    await expect(
      useCase.execute(
        {
          name: 'Ana',
          email: 'ana@example.com',
          password: 'secret',
          roleId: 'role-1',
        } as any,
        RoleType.MODERATOR
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
