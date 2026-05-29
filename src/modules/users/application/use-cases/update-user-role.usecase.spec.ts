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
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.ADVISER, RoleType.MODERATOR],
        manageableUserIds: null,
      }),
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

    const result = await useCase.execute('user-1', 'role-2', { role: RoleType.ADMIN, userId: 'req-1' });

    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        message: 'Rol actualizado correctamente',
      }),
    );
  });

  it('rejects requester outside configured scope', async () => {
    const { useCase } = makeUseCase({
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'req-1',
          roleDescription: RoleType.ADVISER,
          isSuperAdmin: false,
          manageableRoleDescriptions: [RoleType.ADVISER],
          manageableUserIds: null,
        }),
      },
    });

    await expect(
      useCase.execute('user-1', 'role-2', { role: RoleType.ADVISER, userId: 'req-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows superadmin assigning any role', async () => {
    const { useCase } = makeUseCase({
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'req-1',
          roleDescription: RoleType.ADMIN,
          isSuperAdmin: true,
          manageableRoleDescriptions: null,
          manageableUserIds: null,
        }),
      },
      roleReadRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 'role-admin',
          description: RoleType.ADMIN,
          deleted: false,
        }),
      },
      userRepository: {
        findById: jest.fn().mockResolvedValue({ roleId: { value: 'role-1' } }),
        save: jest.fn().mockResolvedValue(undefined),
      },
    });

    const result = await useCase.execute('user-1', 'role-admin', { role: RoleType.ADMIN, userId: 'req-1' });

    expect(result).toEqual(expect.objectContaining({ message: 'Rol actualizado correctamente' }));
  });

  it('allows superadmin removing role', async () => {
    const { useCase, userRepository } = makeUseCase({
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'req-1',
          roleDescription: RoleType.ADMIN,
          isSuperAdmin: true,
          manageableRoleDescriptions: null,
          manageableUserIds: null,
        }),
        findManagementById: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: { id: 'role-1', description: RoleType.ADVISER },
          isSuperAdmin: false,
        }),
      },
    });

    const result = await useCase.execute('user-1', null, { role: RoleType.ADMIN, userId: 'req-1' });

    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ message: 'Rol retirado correctamente' }));
  });

  it('rejects non-superadmin removing role', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute('user-1', null, { role: RoleType.ADMIN, userId: 'req-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when target user does not exist', async () => {
    const { useCase } = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute('user-1', 'role-2', { role: RoleType.ADMIN, userId: 'req-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

