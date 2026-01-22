import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { CreateUserUseCase } from './create-user.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { Email } from 'src/modules/users/domain';
import { RoleRepository} from 'src/modules/roles/application/ports/role.repository';
import { RoleReadRepository } from 'src/modules/roles/application/ports/role-read.repository';



jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('CreateUserUseCase', () => {
  const makeUseCase = (overrides?: {
    userRepository?: any;
    roleRepository?: Partial<RoleRepository>;
    roleReadRepository?: Partial<RoleReadRepository>;
  }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue({}),
    };

    const roleRepository: RoleRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      updateDeleted: jest.fn(),
      update: jest.fn(),
      ...(overrides?.roleRepository ?? {}),
    };

    const roleReadRepository: RoleReadRepository = {
      listRoles: jest.fn(),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      existsByDescription: jest.fn(),
      ...(overrides?.roleReadRepository ?? {}),
    };

    return new CreateUserUseCase(userRepository,  roleReadRepository, roleRepository);
  };

  it('creates user for admin', async () => {
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');

    const roleReadRepository: Partial<RoleReadRepository> = {
      findByDescription: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: RoleType.ADVISER,
        deleted: false,
        createdAt: new Date(),
      }),
    };

    const userRepository = {
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue({}),
    };

    const useCase = makeUseCase({ userRepository, roleReadRepository });

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

  it('rejects when default adviser role is missing', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        findByDescription: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute(
        {
          name: 'Ana',
          email: 'ana@example.com',
          password: 'secret',
        } as any,
        RoleType.ADMIN
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects moderator creating non adviser', async () => {
    const roleReadRepository: Partial<RoleReadRepository> = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: RoleType.ADMIN,
        deleted: false,
        createdAt: new Date(),
      }),
    };

    const useCase = makeUseCase({ roleReadRepository });

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
