import { UnauthorizedException } from '@nestjs/common';
import { ListUsersUseCase } from './list-users.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListUsersUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      listUsers: jest.fn().mockResolvedValue([]),
    };
    return new ListUsersUseCase(userReadRepository);
  };

  it('lists all users for admin by default', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute({ page: 1 }, RoleType.ADMIN);

    expect(result).toEqual([{ id: 'user-1' }]);
    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: undefined,
      sortBy: undefined,
      order: undefined,
      status: 'all',
    });
  });

  it('passes active status when requested', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue([]),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute({ page: 2, status: 'active' }, RoleType.ADMIN);

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 2,
      filters: undefined,
      sortBy: undefined,
      order: undefined,
      status: 'active',
    });
  });

  it('scopes moderator role to ADVISER and preserves requested status', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue([]),
    };
    const useCase = makeUseCase({ userReadRepository });

    await useCase.execute(
      { page: 1, filters: { role: RoleType.ADMIN }, status: 'inactive' },
      RoleType.MODERATOR
    );

    expect(userReadRepository.listUsers).toHaveBeenCalledWith({
      page: 1,
      filters: { role: RoleType.ADVISER },
      sortBy: undefined,
      order: undefined,
      status: 'inactive',
    });
  });

  it('rejects non admin/moderator', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ page: 1 }, RoleType.ADVISER)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
