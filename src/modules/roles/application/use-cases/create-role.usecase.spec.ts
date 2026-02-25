import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CreateRoleUseCase } from './create-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

describe('CreateRoleUseCase', () => {
  const makeUseCase = (overrides?: {
    roleReadRepository?: any;
    roleRepository?: any;
  }) => {
    const roleReadRepository = {
      existsByDescription: jest.fn().mockResolvedValue(false),
      ...overrides?.roleReadRepository,
    };

    const roleRepository = {
      save: jest.fn().mockResolvedValue({}),
      findById: jest.fn(),
      updateDeleted: jest.fn(),
      update: jest.fn(),
      ...overrides?.roleRepository,
    };

    return new CreateRoleUseCase(roleReadRepository, roleRepository);
  };

  it('rejects non-admin', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ description: 'Admin' } as any, RoleType.MODERATOR)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects duplicate role', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        existsByDescription: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(
      useCase.execute({ description: 'Admin' } as any, RoleType.ADMIN)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes description before duplicate check and save', async () => {
    const roleReadRepository = {
      existsByDescription: jest.fn().mockResolvedValue(false),
    };
    const roleRepository = {
      save: jest.fn().mockResolvedValue({}),
    };
    const useCase = makeUseCase({ roleReadRepository, roleRepository });

    await useCase.execute({ description: '  AdMiN  ' } as any, RoleType.ADMIN);

    expect(roleReadRepository.existsByDescription).toHaveBeenCalledWith('admin');
    expect(roleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'admin' }),
    );
  });

  it('rejects description that becomes empty after normalization', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ description: '   ' } as any, RoleType.ADMIN)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates role for admin', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute(
      { description: 'Nuevo Rol' } as any,
      RoleType.ADMIN
    );

    expect(result).toEqual(successResponse('Rol creado correctamente'));
  });

  it('throws when repository save fails', async () => {
    const useCase = makeUseCase({
      roleRepository: {
        save: jest.fn().mockRejectedValue(new Error('fail')),
      },
    });

    await expect(
      useCase.execute({ description: 'Nuevo Rol' } as any, RoleType.ADMIN)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
