import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestoreUserUseCase } from './restore-user.usecase';
import { successResponse } from 'src/shared/response-standard/response';
import { RoleType } from 'src/shared/constantes/constants';

describe('RestoreUserUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any; userReadRepository?: any }) => {
    const userRepository = {
      existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
      updateDeleted: jest.fn(),
      ...overrides?.userRepository,
    };
    const userReadRepository = {
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: "req-1",
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.ADVISER],
        manageableUserIds: null,
      }),
      findManagementById: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: { description: RoleType.ADVISER },
      }),
      ...overrides?.userReadRepository,
    };
    return new RestoreUserUseCase(userRepository, userReadRepository);
  };

  it('restores user', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute('user-1', { role: RoleType.ADMIN, userId: 'req-1' });

    expect(result).toEqual(successResponse('El usuario ha sido restaurado'));
  });

  it('rejects restoring outside configured scope', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'req-1',
          roleDescription: RoleType.ADVISER,
          isSuperAdmin: false,
          manageableRoleDescriptions: [RoleType.ADVISER],
          manageableUserIds: null,
        }),
        findManagementById: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: { description: RoleType.ADMIN },
        }),
      },
    });

    await expect(
      useCase.execute('user-1', { role: RoleType.ADVISER, userId: 'req-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when target user does not exist', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute('user-1', { role: RoleType.ADMIN, userId: 'req-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when user is not deleted', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(
      useCase.execute('user-1', { role: RoleType.ADMIN, userId: 'req-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows superadmin restoring any role', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: "req-1",
          roleDescription: RoleType.ADMIN,
          isSuperAdmin: true,
          manageableRoleDescriptions: null,
          manageableUserIds: null,
        }),
        findManagementById: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: { description: RoleType.MODERATOR },
        }),
      },
    });

    await expect(
      useCase.execute('user-1', { role: RoleType.MODERATOR, userId: 'req-1' }),
    ).resolves.toEqual(successResponse('El usuario ha sido restaurado'));
  });
});
