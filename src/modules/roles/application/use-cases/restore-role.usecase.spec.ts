import { NotFoundException } from '@nestjs/common';
import { RestoreRoleUseCase } from './restore-role.usecase';

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

  it('restores role when it exists', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1' }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ roleRepository });

    const result = await useCase.execute('role-1');

    expect(roleRepository.updateDeleted).toHaveBeenCalledWith('role-1', false);
    expect(result).toEqual({ message: 'Rol restaurado correctamente' });
  });
});
