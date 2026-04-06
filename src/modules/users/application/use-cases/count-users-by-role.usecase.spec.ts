import { ForbiddenException } from '@nestjs/common';
import { CountUsersByRoleUseCase } from './count-users-by-role.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('CountUsersByRoleUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      countUsersByRole: jest.fn().mockResolvedValue({ total: 0, byRole: {} }),
    };
    return new CountUsersByRoleUseCase(userReadRepository);
  };

  it('returns admin summary with the 3 roles', async () => {
    const userReadRepository = {
      countUsersByRole: jest.fn().mockResolvedValue({
        total: 5,
        byRole: {
          [RoleType.ADMIN]: 1,
          [RoleType.MODERATOR]: 2,
          [RoleType.ADVISER]: 2,
        },
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute({ status: 'all' }, RoleType.ADMIN);

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
        role: undefined,
        allowedRoles: [RoleType.ADMIN, RoleType.MODERATOR, RoleType.ADVISER],
      },
      status: 'all',
    });
  });

  it('forces moderator scope to adviser only', async () => {
    const userReadRepository = {
      countUsersByRole: jest.fn().mockResolvedValue({
        total: 9,
        byRole: {
          [RoleType.ADVISER]: 4,
          [RoleType.ADMIN]: 5,
        },
      }),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute({ filters: { role: RoleType.ADMIN } }, RoleType.MODERATOR);

    expect(result).toEqual({
      total: 4,
      byRole: {
        [RoleType.ADVISER]: 4,
      },
    });
    expect(userReadRepository.countUsersByRole).toHaveBeenCalledWith({
      filters: {
        role: RoleType.ADVISER,
        allowedRoles: [RoleType.ADVISER],
      },
      status: 'all',
    });
  });

  it('rejects adviser access', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute({}, RoleType.ADVISER)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
