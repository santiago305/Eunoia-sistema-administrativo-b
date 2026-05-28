import { ListUsersUseCase } from './list-users.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListUsersUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
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
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute({ page: 1 }, { role: RoleType.ADMIN, userId: 'req-1' });

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
      filters: { allowedRoles: [RoleType.ADMIN] },
      sortBy: undefined,
      order: undefined,
      status: 'all',
    });
  });

  it('passes active status when requested', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 15 }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute({ page: 2, status: 'active' }, { role: RoleType.ADMIN, userId: 'req-1' });

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 2,
      filters: { allowedRoles: [RoleType.ADMIN] },
      sortBy: undefined,
      order: undefined,
      status: 'active',
    });
  });

  it('scopes by own role when no explicit scope configured', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.MODERATOR,
        isSuperAdmin: false,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute(
      { page: 1, filters: { role: RoleType.ADMIN }, status: 'inactive' },
      { role: RoleType.MODERATOR, userId: 'req-1' }
    );

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: { role: RoleType.ADMIN, allowedRoles: [RoleType.MODERATOR] },
      sortBy: undefined,
      order: undefined,
      status: 'inactive',
    });
  });

  it('uses explicit configured scope when present', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.ADVISER],
        manageableUserIds: ['u-2'],
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute(
      { page: 1, filters: { role: RoleType.ADMIN } },
      { role: RoleType.ADMIN, userId: 'req-1' },
    );

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: { role: '__none__', allowedRoles: [RoleType.ADVISER], allowedUserIds: ['u-2'] },
      sortBy: undefined,
      order: undefined,
      status: 'all',
    });
  });

  it('allows non-admin roles and scopes to own role', async () => {
    const useCase = makeUseCase();

    await useCase.execute({ page: 1 }, { role: RoleType.ADVISER, userId: 'req-1' });
  });
});
