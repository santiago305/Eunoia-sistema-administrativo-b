import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteUserUseCase } from './delete-user.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

describe('DeleteUserUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any; userReadRepository?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
      updateDeleted: jest.fn(),
    };
    const userReadRepository = overrides?.userReadRepository ?? {
      findManagementScopeById: jest.fn().mockResolvedValue({
        id: "req-1",
        roleDescription: RoleType.ADMIN,
        isSuperAdmin: false,
        manageableRoleDescriptions: [RoleType.ADVISER],
        manageableUserIds: null,
      }),
      findPublicById: jest.fn().mockResolvedValue({
        id: "user-1",
        role: { description: RoleType.ADVISER },
      }),
    };
    return new DeleteUserUseCase(userRepository, userReadRepository);
  };

  it('deletes user for admin', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute('user-1', { role: RoleType.ADMIN, userId: 'req-1' });

    expect(result).toEqual(successResponse('El usuario ha sido eliminado'));
  });

  it('rejects deleting outside configured scope', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementScopeById: jest.fn().mockResolvedValue({
          id: "req-1",
          roleDescription: RoleType.ADVISER,
          isSuperAdmin: false,
          manageableRoleDescriptions: [RoleType.ADVISER],
          manageableUserIds: null,
        }),
        findPublicById: jest.fn().mockResolvedValue({
          id: "user-1",
          role: { description: RoleType.ADMIN },
        }),
      },
    });

    await expect(
      useCase.execute('user-1', { role: RoleType.MODERATOR, userId: 'req-1' })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when user not active', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(
      useCase.execute('user-1', { role: RoleType.ADMIN, userId: 'req-1' })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
