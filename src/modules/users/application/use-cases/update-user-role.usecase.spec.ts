import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateUserRoleUseCase } from './update-user-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('UpdateUserRoleUseCase', () => {
  const makeUseCase = (overrides?: {
    userRepository?: any;
    userReadRepository?: any;
    roleReadRepository?: any;
  }) => {
    const userRepository = {
      findById: jest.fn().mockResolvedValue({ roleId: { value: 'role-1' } }),
      save: jest.fn().mockResolvedValue(undefined),
      ...(overrides?.userRepository ?? {}),
    };
    const userReadRepository = {
      findManagementById: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: { id: 'role-1', description: RoleType.ADVISER },
      }),
      ...(overrides?.userReadRepository ?? {}),
    };
    const roleReadRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-2',
        description: RoleType.MODERATOR,
        deleted: false,
      }),
      ...(overrides?.roleReadRepository ?? {}),
    };

    return {
      useCase: new UpdateUserRoleUseCase(
        userRepository,
        userReadRepository,
        roleReadRepository,
      ),
      userRepository,
      userReadRepository,
      roleReadRepository,
    };
  };

  it('updates role for admin', async () => {
    const { useCase, userRepository } = makeUseCase();

    const result = await useCase.execute('user-1', 'role-2', RoleType.ADMIN);

    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        message: 'Rol actualizado correctamente',
      }),
    );
  });

  it('rejects non admin requester', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute('user-1', 'role-2', RoleType.MODERATOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects assigning admin role', async () => {
    const { useCase } = makeUseCase({
      roleReadRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 'role-admin',
          description: RoleType.ADMIN,
          deleted: false,
        }),
      },
    });

    await expect(
      useCase.execute('user-1', 'role-admin', RoleType.ADMIN),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects changing role for admin target', async () => {
    const { useCase } = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: { id: 'role-admin', description: RoleType.ADMIN },
        }),
      },
    });

    await expect(
      useCase.execute('user-1', 'role-2', RoleType.ADMIN),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when target user does not exist', async () => {
    const { useCase } = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute('user-1', 'role-2', RoleType.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

