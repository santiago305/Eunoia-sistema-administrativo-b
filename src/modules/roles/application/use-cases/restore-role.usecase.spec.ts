import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestoreRoleUseCase } from './restore-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('RestoreRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any }) => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1' }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      update: jest.fn(),
      ...overrides?.roleRepository,
    };

    return new RestoreRoleUseCase(roleRepository);
  };

  it('throws when role does not exist', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('rejects restoring protected system roles', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: RoleType.MODERATOR }),
      updateDeleted: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(roleRepository.updateDeleted).not.toHaveBeenCalled();
  });

  it('restores role when it exists', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: 'custom-role' }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ roleRepository });

    const result = await useCase.execute('role-1');

    expect(roleRepository.updateDeleted).toHaveBeenCalledWith('role-1', false);
    expect(result).toEqual({ message: 'Rol restaurado correctamente' });
  });
});
