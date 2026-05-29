import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { CreateRoleUseCase } from './create-role.usecase';
import { successResponse } from 'src/shared/response-standard/response';

describe('CreateRoleUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any; roleRepository?: any }) => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
      ...overrides?.roleReadRepository,
    };

    const roleRepository = {
      save: jest.fn().mockResolvedValue({ id: 'role-1', description: 'nuevo rol' }),
      findById: jest.fn(),
      ...overrides?.roleRepository,
    };

    return new CreateRoleUseCase(roleReadRepository, roleRepository);
  };

  it('rejects duplicate active role', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        findByDescription: jest.fn().mockResolvedValue({
          id: 'r-1',
          description: 'admin',
          deleted: false,
          createdAt: new Date(),
        }),
      },
    });

    await expect(useCase.execute({ description: 'Admin' } as any, { userId: 'u-1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('normalizes description before duplicate check and save', async () => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
    };
    const roleRepository = {
      save: jest.fn().mockResolvedValue({ id: 'r-1', description: 'admin' }),
    };
    const useCase = makeUseCase({ roleReadRepository, roleRepository });

    await useCase.execute({ description: '  AdMiN  ' } as any, { userId: 'u-1' });

    expect(roleReadRepository.findByDescription).toHaveBeenCalledWith('admin', { includeDeleted: true });
    expect(roleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'admin', createdByUserId: 'u-1' }),
    );
  });

  it('rejects description that becomes empty after normalization', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute({ description: '   ' } as any, { userId: 'u-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates role', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute({ description: 'Nuevo Rol' } as any, { userId: 'u-1' });

    expect(result).toEqual(successResponse('Rol creado correctamente', { id: 'role-1', description: 'nuevo rol' }));
  });

  it('reactivates deleted role when same description exists deleted', async () => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue({
        id: 'r-1',
        description: 'nuevo rol',
        deleted: true,
        createdAt: new Date(),
      }),
    };
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'r-1',
        description: 'nuevo rol',
        deleted: true,
      }),
      save: jest.fn().mockResolvedValue({
        id: 'r-1',
        description: 'nuevo rol',
        deleted: false,
      }),
    };
    const useCase = makeUseCase({ roleReadRepository, roleRepository });

    const result = await useCase.execute({ description: 'Nuevo Rol' } as any, { userId: 'u-1' });

    expect(result).toEqual(successResponse('Rol reactivado correctamente', { id: 'r-1', description: 'nuevo rol' }));
    expect(roleRepository.save).toHaveBeenCalledWith(expect.objectContaining({ deleted: false, createdByUserId: 'u-1' }));
  });

  it('throws when repository save fails', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        save: jest.fn().mockRejectedValue(new Error('fail')),
      },
    });

    await expect(useCase.execute({ description: 'Nuevo Rol' } as any, { userId: 'u-1' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
