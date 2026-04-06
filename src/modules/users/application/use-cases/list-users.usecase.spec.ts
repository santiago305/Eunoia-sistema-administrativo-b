import { ForbiddenException } from '@nestjs/common';
import { ListUsersUseCase } from './list-users.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListUsersUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
    };
    return new ListUsersUseCase(userReadRepository);
  };

  it('lists all users for admin by default', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({
        items: [
          { id: 'user-1', name: 'Ana', email: 'ana@example.com', rol: 'adviser', roleId: 'r1', deleted: false, createdAt: new Date(), password: 'hidden' },
        ],
        total: 1,
        page: 1,
        pageSize: 15,
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute({ page: 1 }, RoleType.ADMIN);

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        rol: 'adviser',
        roleId: 'r1',
        deleted: false,
      }),
    ]);
    expect(result.items[0]).not.toHaveProperty('password');
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(15);
    expect(result.totalPages).toBe(1);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(false);
    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: { allowedRoles: [RoleType.MODERATOR, RoleType.ADVISER], role: undefined },
      sortBy: undefined,
      order: undefined,
      status: 'all',
    });
  });

  it('passes active status when requested', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 15 }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute({ page: 2, status: 'active' }, RoleType.ADMIN);

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 2,
      filters: { allowedRoles: [RoleType.MODERATOR, RoleType.ADVISER], role: undefined },
      sortBy: undefined,
      order: undefined,
      status: 'active',
    });
  });

  it('scopes moderator role to ADVISER and preserves requested status', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute(
      { page: 1, filters: { role: RoleType.ADMIN }, status: 'inactive' },
      RoleType.MODERATOR
    );

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: { role: RoleType.ADVISER, allowedRoles: [RoleType.ADVISER] },
      sortBy: undefined,
      order: undefined,
      status: 'inactive',
    });
  });

  it('returns empty scope when admin requests admin role', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute(
      { page: 1, filters: { role: RoleType.ADMIN } },
      RoleType.ADMIN,
    );

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: { role: '__none__', allowedRoles: [RoleType.MODERATOR, RoleType.ADVISER] },
      sortBy: undefined,
      order: undefined,
      status: 'all',
    });
  });

  it('rejects non admin/moderator', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ page: 1 }, RoleType.ADVISER)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
