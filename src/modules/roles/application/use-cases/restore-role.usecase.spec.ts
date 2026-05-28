import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RestoreRoleUseCase } from './restore-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('RestoreRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any; userReadRepository?: any }) => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1' }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      update: jest.fn(),
      ...overrides?.roleRepository,
    };
    const userReadRepository = {
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'u-1',
        roleDescription: RoleType.MODERATOR,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.MODERATOR],
        manageableUserIds: null,
      }),
      ...overrides?.userReadRepository,
    };

    return new RestoreRoleUseCase(roleRepository, userReadRepository);
  };

  it('throws when role does not exist', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('role-1', { userId: 'u-1', role: RoleType.MODERATOR })).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('rejects restore when role is already active', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: RoleType.MODERATOR,
        deleted: false,
      }),
      updateDeleted: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1', { userId: 'u-1', role: RoleType.MODERATOR })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(roleRepository.updateDeleted).not.toHaveBeenCalled();
  });

  it('restores role when it exists', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: RoleType.MODERATOR,
        deleted: true,
      }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ roleRepository });

    const result = await useCase.execute('role-1', { userId: 'u-1', role: RoleType.MODERATOR });

    expect(roleRepository.updateDeleted).toHaveBeenCalledWith('role-1', false);
    expect(result).toEqual({ message: 'Rol restaurado correctamente' });
  });
});
