import { BadRequestException, ConflictException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { CreateRoleUseCase } from './create-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

describe('CreateRoleUseCase', () => {
  const makeUseCase = (overrides?: {
    roleReadRepository?: any;
    roleRepository?: any;
  }) => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
      ...overrides?.roleReadRepository,
    };

    const roleRepository = {
      save: jest.fn().mockResolvedValue({}),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      updateDeleted: jest.fn(),
      update: jest.fn(),
      ...overrides?.roleRepository,
    };

    return new CreateRoleUseCase(roleReadRepository, roleRepository);
  };

  it('rejects non-admin', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ description: 'Admin' } as any, { role: RoleType.MODERATOR, userId: 'u-1' })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate role', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        findByDescription: jest.fn().mockResolvedValue({
          id: "r-1",
          description: "admin",
          deleted: false,
          createdAt: new Date(),
        }),
      },
    });

    await expect(
      useCase.execute({ description: 'Admin' } as any, { role: RoleType.ADMIN, userId: 'u-1' })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('normalizes description before duplicate check and save', async () => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue(null),
    };
    const roleRepository = {
      save: jest.fn().mockResolvedValue({}),
    };
    const useCase = makeUseCase({ roleReadRepository, roleRepository });

    await useCase.execute({ description: '  AdMiN  ' } as any, { role: RoleType.ADMIN, userId: 'u-1' });

    expect(roleReadRepository.findByDescription).toHaveBeenCalledWith('admin', { includeDeleted: true });
    expect(roleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'admin' }),
    );
  });

  it('rejects description that becomes empty after normalization', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ description: '   ' } as any, { role: RoleType.ADMIN, userId: 'u-1' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates role for admin', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute(
      { description: 'Nuevo Rol' } as any,
      { role: RoleType.ADMIN, userId: 'u-1' }
    );

    expect(result).toEqual(
      successResponse('Rol creado correctamente', { id: undefined, description: undefined }),
    );
  });

  it('reactivates deleted role when same description exists deleted', async () => {
    const roleReadRepository = {
      findByDescription: jest.fn().mockResolvedValue({
        id: "r-1",
        description: "nuevo rol",
        deleted: true,
        createdAt: new Date(),
      }),
    };
    const roleRepository = {
      findById: jest.fn().mockResolvedValue({
        id: "r-1",
        description: "nuevo rol",
        deleted: true,
      }),
      save: jest.fn().mockResolvedValue({
        id: "r-1",
        description: "nuevo rol",
        deleted: false,
      }),
    };
    const useCase = makeUseCase({ roleReadRepository, roleRepository });

    const result = await useCase.execute(
      { description: "Nuevo Rol" } as any,
      { role: RoleType.ADMIN, userId: "u-1" },
    );

    expect(result).toEqual(
      successResponse('Rol reactivado correctamente', { id: 'r-1', description: 'nuevo rol' }),
    );
  });

  it('throws when repository save fails', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        save: jest.fn().mockRejectedValue(new Error('fail')),
      },
    });

    await expect(
      useCase.execute({ description: 'Nuevo Rol' } as any, { role: RoleType.ADMIN, userId: 'u-1' })
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
