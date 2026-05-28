import { ListRolesUseCase } from './list-roles.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListRolesUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any; userReadRepository?: any }) => {
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      existsByDescription: jest.fn(),
      ...overrides?.roleReadRepository,
    };
    const userReadRepository = {
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: 'u-1',
        roleDescription: RoleType.MODERATOR,
        isSuperAdmin: false,
        manageableRoleDescriptions: null,
        manageableUserIds: null,
      }),
      ...overrides?.userReadRepository,
    };

    return { useCase: new ListRolesUseCase(roleReadRepository, userReadRepository), roleReadRepository, userReadRepository };
  };

  it('returns roles for super admin', async () => {
    const expected = [
      { id: 'role-1', description: 'admin', deleted: false, createdAt: new Date() },
      { id: 'role-2', description: 'custom_role', deleted: false, createdAt: new Date() },
    ];
    const { useCase } = makeUseCase({
      roleReadRepository: { listRoles: jest.fn().mockResolvedValue(expected) },
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'u-1',
          roleDescription: null,
          isSuperAdmin: true,
          manageableRoleDescriptions: null,
          manageableUserIds: null,
        }),
      },
    });

    const result = await useCase.execute({ status: 'all' }, { userId: 'u-1', role: null });
    expect(result).toEqual(expected);
  });

  it('scopes roles by configured management scope', async () => {
    const expected = [
      { id: 'role-1', description: 'moderator', deleted: false, createdAt: new Date() },
      { id: 'role-2', description: 'adviser', deleted: false, createdAt: new Date() },
      { id: 'role-3', description: 'admin', deleted: false, createdAt: new Date() },
    ];
    const { useCase } = makeUseCase({
      roleReadRepository: { listRoles: jest.fn().mockResolvedValue(expected) },
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'u-1',
          roleDescription: RoleType.MODERATOR,
          isSuperAdmin: false,
          manageableRoleDescriptions: [RoleType.MODERATOR, RoleType.ADVISER],
          manageableUserIds: null,
        }),
      },
    });

    const result = await useCase.execute({ status: 'all' }, { userId: 'u-1', role: RoleType.MODERATOR });
    expect(result.map((item) => item.description)).toEqual(['moderator', 'adviser']);
  });

  it('keeps role created by requester even outside role-description scope', async () => {
    const expected = [
      {
        id: 'role-1',
        description: 'custom_created_by_user',
        deleted: false,
        createdAt: new Date(),
        createdByUserId: 'u-1',
      },
      {
        id: 'role-2',
        description: 'admin',
        deleted: false,
        createdAt: new Date(),
        createdByUserId: 'u-2',
      },
    ];
    const { useCase } = makeUseCase({
      roleReadRepository: { listRoles: jest.fn().mockResolvedValue(expected) },
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: 'u-1',
          roleDescription: RoleType.MODERATOR,
          isSuperAdmin: false,
          manageableRoleDescriptions: [RoleType.MODERATOR],
          manageableUserIds: null,
        }),
      },
    });

    const result = await useCase.execute({ status: 'all' }, { userId: 'u-1', role: RoleType.MODERATOR });
    expect(result.map((item) => item.id)).toEqual(['role-1']);
  });
});
