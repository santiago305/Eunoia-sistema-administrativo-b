import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { CreateUserUseCase } from './create-user.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { Email } from 'src/modules/users/domain';
import { RoleReadRepository } from 'src/modules/roles/application/ports/role-read.repository';



jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('CreateUserUseCase', () => {
  const makeUseCase = (overrides?: {
    userRepository?: any;
    roleReadRepository?: Partial<RoleReadRepository>;
    userReadRepository?: any;
  }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue({}),
    };

    const roleReadRepository: RoleReadRepository = {
      listRoles: jest.fn(),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      existsByDescription: jest.fn(),
      ...(overrides?.roleReadRepository ?? {}),
    };

    const userReadRepository = overrides?.userReadRepository ?? {
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.ADVISER, RoleType.MODERATOR],
        manageableUserIds: null,
      }),
    };

    return new CreateUserUseCase(userRepository, roleReadRepository, userReadRepository);
  };

  it('creates user for admin', async () => {
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');

    const roleReadRepository: Partial<RoleReadRepository> = {
      findById: jest.fn().mockResolvedValue({
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
        roleId: 'role-1',
      } as any,
      { role: RoleType.ADMIN, userId: 'req-1' }
    );

    expect(userRepository.existsByEmail).toHaveBeenCalledWith(new Email('ana@example.com'));
    expect(roleReadRepository.findById).toHaveBeenCalledWith('role-1');
    expect(userRepository.save).toHaveBeenCalled();
    expect(result).toEqual(successResponse('Usuario creado correctamente', { id: undefined }));
  });

  it('rejects when scope does not allow target role', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 'role-x',
          description: RoleType.ADMIN,
          deleted: false,
          createdAt: new Date(),
        }),
      },
    });

    await expect(
      useCase.execute({ email: 'ana@example.com', roleId: 'role-x' } as any, { role: RoleType.ADVISER, userId: 'req-1' })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate email', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByEmail: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(
      useCase.execute({ email: 'ana@example.com' } as any, { role: RoleType.ADMIN, userId: 'req-1' })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when role is missing', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {},
    });

    await expect(
      useCase.execute(
        {
          name: 'Ana',
          email: 'ana@example.com',
          password: 'secret',
        } as any,
        { role: RoleType.ADMIN, userId: 'req-1' }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when roleId does not exist', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute(
        {
          name: 'Ana',
          email: 'ana@example.com',
          password: 'secret',
          roleId: 'role-x',
        } as any,
        { role: RoleType.ADMIN, userId: 'req-1' }
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects creating role outside configured scope', async () => {
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
        { role: RoleType.MODERATOR, userId: 'req-1' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows superadmin to create any role', async () => {
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');
    const roleReadRepository: Partial<RoleReadRepository> = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: RoleType.ADMIN,
        deleted: false,
        createdAt: new Date(),
      }),
    };
    const userReadRepository = {
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: true,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
    };
    const userRepository = {
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue({ id: 'u-2' }),
    };

    const useCase = makeUseCase({ roleReadRepository, userReadRepository, userRepository });

    const result = await useCase.execute(
      {
        name: 'Ana',
        email: 'ana@example.com',
        password: 'secret',
        roleId: 'role-1',
      } as any,
      { role: RoleType.ADMIN, userId: 'req-1' }
    );

    expect(result).toEqual(successResponse('Usuario creado correctamente', { id: 'u-2' }));
  });
});
