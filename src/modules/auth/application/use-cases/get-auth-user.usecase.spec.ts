import { UnauthorizedException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';
import { GetAuthUserUseCase } from './get-auth-user.usecase';

describe('GetAuthUserUseCase', () => {
  const makeUseCase = () => {
    const accessControlService = {
      getUserRoles: jest.fn().mockResolvedValue([RoleType.ADMIN]),
      getEffectivePermissions: jest.fn().mockResolvedValue([]),
      getUserPreferredHomePath: jest.fn().mockResolvedValue('/dashboard'),
    } as any;

    return {
      useCase: new GetAuthUserUseCase(accessControlService),
      accessControlService,
    };
  };

  it('returns user_id and rol from id', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ id: 'user-1', role: RoleType.ADMIN });

    expect(result).toEqual(
      expect.objectContaining({ user_id: 'user-1', rol: RoleType.ADMIN }),
    );
  });

  it('returns user_id from sub when id is missing', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ sub: 'user-2', role: RoleType.MODERATOR });

    expect(result).toEqual(
      expect.objectContaining({ user_id: 'user-2', rol: RoleType.MODERATOR }),
    );
  });

  it('uses default role when role is missing', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ id: 'user-3' });

    expect(result).toEqual(
      expect.objectContaining({ user_id: 'user-3', rol: RoleType.ADVISER }),
    );
  });

  it('throws when no identifier is provided', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({})).rejects.toThrow(UnauthorizedException);
  });
});
