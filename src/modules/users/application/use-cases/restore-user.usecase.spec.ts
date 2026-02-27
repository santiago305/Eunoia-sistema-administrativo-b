import { UnauthorizedException } from '@nestjs/common';
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

  it('rejects when user not deleted', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(useCase.execute('user-1', RoleType.ADMIN)).rejects.toBeInstanceOf(UnauthorizedException);
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

    await expect(useCase.execute('user-1', RoleType.MODERATOR)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
