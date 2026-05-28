import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteRoleUseCase } from './delete-role.usecase';

describe('DeleteRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any }) => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1' }),
      updateDeleted: jest.fn().mockResolvedValue(undefined),
      ...overrides?.roleRepository,
    };

    return new DeleteRoleUseCase(roleRepository);
  };

  it('throws when role does not exist', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects direct delete for existing roles', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: 'custom-role' }),
      updateDeleted: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(roleRepository.updateDeleted).not.toHaveBeenCalled();
  });
});
