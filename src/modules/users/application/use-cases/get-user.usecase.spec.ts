import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetUserUseCase } from './get-user.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

describe('GetUserUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      findPublicById: jest.fn(),
    };
    return new GetUserUseCase(userReadRepository);
  };

  it('throws when not found', async () => {
    const useCase = makeUseCase({
      userReadRepository: { findPublicById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('user-1', RoleType.ADMIN)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns success response for admin', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findPublicById: jest.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Ana',
          email: 'ana@example.com',
          avatarUrl: '/api/assets/users/avatar.webp',
          deleted: false,
          role: { description: RoleType.ADVISER },
        }),
      },
    });

    const result = await useCase.execute('user-1', RoleType.ADMIN);
    expect(result).toEqual(
      successResponse('usuarios encontrado', {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        avatarUrl: '/api/assets/users/avatar.webp',
        rol: RoleType.ADVISER,
        deleted: false,
      })
    );
  });

  it('rejects moderator when target is not adviser', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findPublicById: jest.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Ana',
          email: 'ana@example.com',
          deleted: false,
          role: { description: RoleType.ADMIN },
        }),
      },
    });

    await expect(
      useCase.execute('user-1', RoleType.MODERATOR)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
