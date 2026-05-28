import { NotFoundException } from '@nestjs/common';
import { GetUserByEmailUseCase } from './get-user-by-email.usecase';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

describe('GetUserByEmailUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      findManagementByEmail: jest.fn(),
    };
    return new GetUserByEmailUseCase(userReadRepository);
  };

  it('throws when not found', async () => {
    const useCase = makeUseCase({
      userReadRepository: { findManagementByEmail: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('ana@example.com', RoleType.ADMIN)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns success response for admin', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementByEmail: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ana@example.com',
          roleDescription: RoleType.ADVISER,
          deleted: false,
        }),
      },
    });

    const result = await useCase.execute('ana@example.com', RoleType.ADMIN);
    expect(result).toEqual(
      successResponse('Usuario encontrado', {
        id: 'user-1',
        email: 'ana@example.com',
        rol: RoleType.ADVISER,
        deleted: false,
      })
    );
  });

  it('returns success response for moderator too', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findManagementByEmail: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ana@example.com',
          roleDescription: RoleType.ADMIN,
          deleted: false,
        }),
      },
    });

    await expect(useCase.execute('ana@example.com', RoleType.MODERATOR)).resolves.toEqual(
      successResponse('Usuario encontrado', {
        id: 'user-1',
        email: 'ana@example.com',
        rol: RoleType.ADMIN,
        deleted: false,
      }),
    );
  });
});
