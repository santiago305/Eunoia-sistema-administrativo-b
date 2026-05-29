import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateRoleUseCase } from './update-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('UpdateRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleRepository?: any; roleReadRepository?: any; userReadRepository?: any }) => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
      ...overrides?.roleReadRepository,
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

    const roleRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: 'Old',
      }),
      save: jest.fn().mockResolvedValue({}),
      ...overrides?.roleRepository,
    };

    return new UpdateRoleUseCase(roleReadRepository, roleRepository, userReadRepository);
  };

  it('throws when role does not exist', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('role-1', { description: 'New' } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when no updatable fields are provided', async () => {
    const roleRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(roleRepository.findById).not.toHaveBeenCalled();
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('rejects description that becomes empty after normalization', async () => {
    const roleRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository });

    await expect(useCase.execute('role-1', { description: '   ' } as any)).rejects.toBeInstanceOf(BadRequestException);
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

    expect(role.description).toBe('new');
    expect(roleRepository.save).toHaveBeenCalledWith(role);
    expect(result).toEqual({ message: 'Rol actualizado correctamente' });
  });

  it('normalizes description before duplicate check and save', async () => {
    const role = { id: 'role-1', description: 'old' };
    const roleRepository = {
      findById: jest.fn().mockResolvedValue(role),
      save: jest.fn().mockResolvedValue({}),
    };
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    await useCase.execute('role-1', { description: '  AdViSeR  ' } as any);

    expect(roleReadRepository.findByDescription).toHaveBeenCalledWith('adviser', { includeDeleted: true });
    expect(role.description).toBe('adviser');
    expect(roleRepository.save).toHaveBeenCalledWith(role);
  });

  it('throws conflict when new description already exists', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: 'Old' }),
      save: jest.fn(),
    };
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue({
        id: 'role-2',
        description: 'admin',
        deleted: false,
      }),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    await expect(useCase.execute('role-1', { description: 'Admin' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(roleReadRepository.findByDescription).toHaveBeenCalledWith('admin', { includeDeleted: true });
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('rejects renaming master role', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: RoleType.SUPER_ADMINISTRATOR }),
      save: jest.fn(),
    };
    const roleReadRepository = {
      findByDescription: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    await expect(useCase.execute('role-1', { description: 'admin-renamed' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(roleReadRepository.findByDescription).not.toHaveBeenCalled();
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('does not check duplicates when description is semantically unchanged', async () => {
    const role = { id: 'role-1', description: 'Same' };
    const roleRepository = {
      findById: jest.fn().mockResolvedValue(role),
      save: jest.fn().mockResolvedValue({}),
    };
    const roleReadRepository = {
      findByDescription: jest.fn(),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    const result = await useCase.execute('role-1', { description: 'Same' } as any);

    expect(roleReadRepository.findByDescription).not.toHaveBeenCalled();
    expect(role.description).toBe('same');
    expect(roleRepository.save).toHaveBeenCalledWith(role);
    expect(result).toEqual({ message: 'Rol actualizado correctamente' });
  });

  it('maps unique violation from db to conflict exception', async () => {
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', description: 'Old' }),
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
    };
    const useCase = makeUseCase({ roleRepository, roleReadRepository });

    await expect(useCase.execute('role-1', { description: 'New' } as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
