import { UnauthorizedException } from '@nestjs/common';
import { GetOwnUserUseCase } from './get-own-user.usecase';
import { successResponse } from 'src/shared/response-standard/response';

describe('GetOwnUserUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      findPublicById: jest.fn(),
    };
    return new GetOwnUserUseCase(userReadRepository);
  };

  it('returns own user', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findPublicById: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
    });

    const result = await useCase.execute('user-1');
    expect(result).toEqual(successResponse('Usuario encontrado', { id: 'user-1' }));
  });

  it('throws when not found', async () => {
    const useCase = makeUseCase({
      userReadRepository: { findPublicById: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
