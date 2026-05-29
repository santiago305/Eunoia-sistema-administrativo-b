import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteRoleUseCase } from './delete-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('DeleteRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any; userReadRepository?: any }) => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1' }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
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

    return new DeleteRoleUseCase(roleRepository, userReadRepository);
  };

  it('throws when role does not exist', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('role-1', { userId: 'u-1', role: RoleType.MODERATOR })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects direct delete for existing roles', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: RoleType.MODERATOR }),
      updateDeleted: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1', { userId: 'u-1', role: RoleType.MODERATOR })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(roleRepository.updateDeleted).not.toHaveBeenCalled();
  });
});
