import { UnauthorizedException } from '@nestjs/common';
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
      findPublicById: jest.fn().mockResolvedValue({
        role: { description: RoleType.ADVISER },
      }),
    };
    return new DeleteUserUseCase(userRepository, userReadRepository);
  };

  it('deletes user for admin', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute('user-1', RoleType.ADMIN);

    expect(result).toEqual(successResponse('El usuario ha sido eliminado'));
  });

  it('rejects moderator deleting admin', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findPublicById: jest.fn().mockResolvedValue({
          role: { description: RoleType.ADMIN },
        }),
      },
    });

    await expect(
      useCase.execute('user-1', RoleType.MODERATOR)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when user not active', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(
      useCase.execute('user-1', RoleType.ADMIN)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
