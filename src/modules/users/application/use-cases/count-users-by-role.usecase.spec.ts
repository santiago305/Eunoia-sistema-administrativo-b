import { CountUsersByRoleUseCase } from './count-users-by-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('CountUsersByRoleUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      countUsersByRole: jest.fn().mockResolvedValue({ total: 0, byRole: {} }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
    };
    return new CountUsersByRoleUseCase(userReadRepository);
  };

  it('returns scoped summary', async () => {
    const userReadRepository = {
      countUsersByRole: jest.fn().mockResolvedValue({
        total: 5,
        byRole: {
          [RoleType.ADMIN]: 1,
          [RoleType.MODERATOR]: 2,
          [RoleType.ADVISER]: 2,
        },
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

    const result = await useCase.execute({ status: 'all' }, { role: RoleType.ADMIN, userId: 'req-1' });

    expect(result).toEqual({
      total: 5,
      byRole: {
        [RoleType.ADMIN]: 1,
        [RoleType.MODERATOR]: 2,
        [RoleType.ADVISER]: 2,
      },
    });
    expect(userReadRepository.countUsersByRole).toHaveBeenCalledWith({
      filters: {
        allowedRoles: [RoleType.ADMIN],
        excludeSuperAdmins: true,
      },
      status: 'all',
    });
  });

  it('uses explicit configured scope when present', async () => {
    const userReadRepository = {
      countUsersByRole: jest.fn().mockResolvedValue({
        total: 9,
        byRole: {
          [RoleType.ADVISER]: 4,
          [RoleType.ADMIN]: 5,
        },
      }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: RoleType.MODERATOR,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.ADVISER],
        manageableUserIds: ['u-2'],
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute(
      { filters: { role: RoleType.ADMIN } },
      { role: RoleType.MODERATOR, userId: 'req-1' },
    );

    expect(result).toEqual({
      total: 9,
      byRole: {
        [RoleType.ADVISER]: 4,
        [RoleType.ADMIN]: 5,
      },
    });
    expect(userReadRepository.countUsersByRole).toHaveBeenCalledWith({
      filters: {
        role: '__none__',
        allowedRoles: [RoleType.ADVISER],
        allowedUserIds: ['u-2'],
        excludeSuperAdmins: true,
      },
      status: 'all',
    });
  });

  it('allows superadmin but excludes other superadmins keeping self', async () => {
    const userReadRepository = {
      countUsersByRole: jest.fn().mockResolvedValue({
        total: 1,
        byRole: {},
      }),
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'req-1',
        roleDescription: null,
        isSuperAdmin: true,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute({ status: 'all' }, { role: null, userId: 'req-1' });

    expect(userReadRepository.countUsersByRole).toHaveBeenCalledWith({
      filters: {
        excludeSuperAdmins: true,
        includeUserIdWhenExcludingSuperAdmins: 'req-1',
      },
      status: 'all',
    });
  });

  it('allows adviser and scopes by own role', async () => {
    const useCase = makeUseCase();

    await useCase.execute({}, { role: RoleType.ADVISER, userId: 'req-1' });
  });
});
