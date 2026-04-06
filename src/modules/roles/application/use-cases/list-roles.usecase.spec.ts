import { ListRolesUseCase } from './list-roles.usecase';
import { ForbiddenException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListRolesUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any }) => {
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      existsByDescription: jest.fn(),
      ...overrides?.roleReadRepository,
    };

    return new ListRolesUseCase(roleReadRepository);
  };

  it('returns roles', async () => {
    const expected = [
      {
        id: 'role-1',
        description: 'Admin',
        deleted: false,
        createdAt: new Date(),
      },
    ];
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue(expected),
    };
    const useCase = makeUseCase({ roleReadRepository });

    const result = await useCase.execute(undefined, RoleType.ADMIN);

    expect(roleReadRepository.listRoles).toHaveBeenCalledWith({
      status: 'all',
    });
    expect(result).toEqual(expected);
  });

  it('accepts explicit status filter', async () => {
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue([]),
    };
    const useCase = makeUseCase({ roleReadRepository });

    await useCase.execute({ status: 'inactive' }, RoleType.ADMIN);

    expect(roleReadRepository.listRoles).toHaveBeenCalledWith({
      status: 'inactive',
    });
  });

  it('returns only adviser role for moderator', async () => {
    const expected = [
      { id: 'role-1', description: RoleType.ADMIN, deleted: false, createdAt: new Date() },
      { id: 'role-2', description: RoleType.MODERATOR, deleted: false, createdAt: new Date() },
      { id: 'role-3', description: RoleType.ADVISER, deleted: false, createdAt: new Date() },
    ];
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue(expected),
    };
    const useCase = makeUseCase({ roleReadRepository });

    const result = await useCase.execute(undefined, RoleType.MODERATOR);

    expect(result).toEqual([expected[2]]);
  });

  it('rejects listing roles for non-management roles', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute(undefined, RoleType.ADVISER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
