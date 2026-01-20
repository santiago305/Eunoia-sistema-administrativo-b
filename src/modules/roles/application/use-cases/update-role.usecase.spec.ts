import { NotFoundException } from '@nestjs/common';
import { UpdateRoleUseCase } from './update-role.usecase';

describe('UpdateRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any }) => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: 'Old',
      }),
      save: jest.fn().mockResolvedValue({}),
      updateDeleted: jest.fn(),
      update: jest.fn(),
      ...overrides?.roleRepository,
    };

    return new UpdateRoleUseCase(roleRepository);
  };

  it('throws when role does not exist', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute('role-1', { description: 'New' } as any)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates role when it exists', async () => {
    const role = { id: 'role-1', description: 'Old' };
    const roleRepository = {
      findById: jest.fn().mockResolvedValue(role),
      save: jest.fn().mockResolvedValue({}),
    };
    const useCase = makeUseCase({ roleRepository });

    const result = await useCase.execute('role-1', { description: 'New' } as any);

    expect(role.description).toBe('New');
    expect(roleRepository.save).toHaveBeenCalledWith(role);
    expect(result).toEqual({ message: 'Rol actualizado correctamente' });
  });
});
