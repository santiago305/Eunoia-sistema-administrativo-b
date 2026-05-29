import { NotFoundException } from '@nestjs/common';
import { GetRoleByIdUseCase } from './get-role-by-id.usecase';
import { ForbiddenException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';

describe('GetRoleByIdUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any; userReadRepository?: any }) => {
    const roleReadRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: 'moderator',
        deleted: false,
        createdAt: new Date(),
      }),
      findByDescription: jest.fn(),
      listRoles: jest.fn(),
      existsByDescription: jest.fn(),
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

    return new GetRoleByIdUseCase(roleReadRepository, userReadRepository);
  };

  it('returns role when found', async () => {
    const expected = {
      id: 'role-1',
      description: 'Admin',
      deleted: false,
      createdAt: new Date(),
    };
    const useCase = makeUseCase({
      roleReadRepository: { findById: jest.fn().mockResolvedValue(expected) },
    });

    const result = await useCase.execute('role-1');

    expect(result).toEqual(expected);
  });

  it('throws when not found', async () => {
    const useCase = makeUseCase({
      roleReadRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects role outside requester scope', async () => {
    const useCase = makeUseCase({
      roleReadRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 'role-1',
          description: 'admin',
          deleted: false,
          createdAt: new Date(),
          createdByUserId: 'u-2',
        }),
      },
    });

    await expect(
      useCase.execute('role-1', { userId: 'u-1', role: RoleType.MODERATOR }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
