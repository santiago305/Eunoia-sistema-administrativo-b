import { UnauthorizedException } from '@nestjs/common';
import { ListActiveUsersUseCase } from './list-active-users.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListActiveUsersUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      listUsers: jest.fn().mockResolvedValue([]),
    };
    return new ListActiveUsersUseCase(userReadRepository);
  };

  it('lists active users for admin', async () => {
    const userReadRepository = {
      listUsers: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
    };
    const useCase = makeUseCase({ userReadRepository });

    const result = await useCase.execute({ page: 1 }, RoleType.ADMIN);

    expect(result).toEqual([{ id: 'user-1' }]);
  });

  it('rejects non admin/moderator', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ page: 1 }, RoleType.ADVISER)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
