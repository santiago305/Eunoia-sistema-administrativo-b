import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestoreUserUseCase } from './restore-user.usecase';
import { successResponse } from 'src/shared/response-standard/response';
import { RoleType } from 'src/shared/constantes/constants';

describe('RestoreUserUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any; userReadRepository?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
      updateDeleted: jest.fn(),
    };
    const userReadRepository = overrides?.userReadRepository ?? {
      findManagementById: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: { description: RoleType.ADVISER },
      }),
    };
    return new RestoreUserUseCase(userRepository, userReadRepository);
  };

  it('restores user', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute('user-1', RoleType.ADMIN);

    expect(result).toEqual(successResponse('El usuario ha sido restaurado'));
  });

  it('rejects when requester role cannot restore users', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute('user-1', RoleType.ADVISER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when target user does not exist', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute('user-1', RoleType.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when user is not deleted', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(useCase.execute('user-1', RoleType.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects moderator restoring non-adviser', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: { description: RoleType.MODERATOR },
        }),
      },
    });

    await expect(useCase.execute('user-1', RoleType.MODERATOR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects restoring admin users', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementById: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: { description: RoleType.ADMIN },
        }),
      },
    });

    await expect(useCase.execute('user-1', RoleType.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
