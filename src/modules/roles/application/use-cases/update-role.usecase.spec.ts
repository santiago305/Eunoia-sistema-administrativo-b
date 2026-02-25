import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateRoleUseCase } from './update-role.usecase';

describe('UpdateRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any; roleReadRepository?: any }) => {
    const roleReadRepository = {
      existsByDescription: jest.fn().mockResolvedValue(false),
      listRoles: jest.fn(),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      ...overrides?.roleReadRepository,
    };

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

    return new UpdateRoleUseCase(roleReadRepository, roleRepository);
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

  it('throws when no updatable fields are provided', async () => {
    const roleRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1', {} as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(roleRepository.findById).not.toHaveBeenCalled();
    expect(roleRepository.save).not.toHaveBeenCalled();
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

  it('throws conflict when new description already exists', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: 'Old' }),
      save: jest.fn(),
    };
    const roleReadRepository = {
      existsByDescription: jest.fn().mockResolvedValue(true),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    await expect(useCase.execute('role-1', { description: 'Admin' } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(roleReadRepository.existsByDescription).toHaveBeenCalledWith('Admin');
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('does not check duplicates when description is unchanged', async () => {
    const role = { id: 'role-1', description: 'Same' };
    const roleRepository = {
      findById: jest.fn().mockResolvedValue(role),
      save: jest.fn().mockResolvedValue({}),
    };
    const roleReadRepository = {
      existsByDescription: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    const result = await useCase.execute('role-1', { description: 'Same' } as any);

    expect(roleReadRepository.existsByDescription).not.toHaveBeenCalled();
    expect(roleRepository.save).toHaveBeenCalledWith(role);
    expect(result).toEqual({ message: 'Rol actualizado correctamente' });
  });

  it('maps unique violation from db to conflict exception', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: 'Old' }),
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const roleReadRepository = {
      existsByDescription: jest.fn().mockResolvedValue(false),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    await expect(useCase.execute('role-1', { description: 'New' } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
