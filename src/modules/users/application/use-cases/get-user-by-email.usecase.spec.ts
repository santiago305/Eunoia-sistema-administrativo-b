import { UnauthorizedException } from '@nestjs/common';
import { GetUserByEmailUseCase } from './get-user-by-email.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { errorResponse, successResponse } from 'src/shared/response-standard/response';

describe('GetUserByEmailUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      findPublicByEmail: jest.fn(),
    };
    return new GetUserByEmailUseCase(userReadRepository);
  };

  it('returns error response when not found', async () => {
    const useCase = makeUseCase({
      userReadRepository: { findPublicByEmail: jest.fn().mockResolvedValue(null) },
    });

    const result = await useCase.execute('ana@example.com', RoleType.ADMIN);
    expect(result).toEqual(errorResponse('No hemos encontrado el usuario'));
  });

  it('returns success response for admin', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findPublicByEmail: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ana@example.com',
          roleDescription: RoleType.ADVISER,
        }),
      },
    });

    const result = await useCase.execute('ana@example.com', RoleType.ADMIN);
    expect(result).toEqual(
      successResponse('Usuario encontrado', {
        id: 'user-1',
        email: 'ana@example.com',
        rol: RoleType.ADVISER,
      })
    );
  });

  it('rejects moderator when target is not adviser', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findPublicByEmail: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ana@example.com',
          roleDescription: RoleType.ADMIN,
        }),
      },
    });

    await expect(
      useCase.execute('ana@example.com', RoleType.MODERATOR)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
