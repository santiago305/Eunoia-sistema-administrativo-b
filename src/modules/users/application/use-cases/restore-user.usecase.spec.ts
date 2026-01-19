import { UnauthorizedException } from '@nestjs/common';
import { RestoreUserUseCase } from './restore-user.usecase';
import { successResponse } from 'src/shared/response-standard/response';

describe('RestoreUserUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
      updateDeleted: jest.fn(),
    };
    return new RestoreUserUseCase(userRepository);
  };

  it('restores user', async () => {
    const useCase = makeUseCase();

    const result = await useCase.execute('user-1');

    expect(result).toEqual(successResponse('El usuario ha sido restaurado'));
  });

  it('rejects when user not deleted', async () => {
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(useCase.execute('user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
