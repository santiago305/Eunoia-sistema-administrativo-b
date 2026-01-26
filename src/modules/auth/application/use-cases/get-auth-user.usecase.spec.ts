import { UnauthorizedException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';
import { GetAuthUserUseCase } from './get-auth-user.usecase';

describe('GetAuthUserUseCase', () => {
  it('returns user_id and rol from id', () => {
    const useCase = new GetAuthUserUseCase();

    const result = useCase.execute({ id: 'user-1', role: RoleType.ADMIN });

    expect(result).toEqual({ user_id: 'user-1', rol: RoleType.ADMIN });
  });

  it('returns user_id from sub when id is missing', () => {
    const useCase = new GetAuthUserUseCase();

    const result = useCase.execute({ sub: 'user-2', role: RoleType.MODERATOR });

    expect(result).toEqual({ user_id: 'user-2', rol: RoleType.MODERATOR });
  });

  it('uses default role when role is missing', () => {
    const useCase = new GetAuthUserUseCase();

    const result = useCase.execute({ id: 'user-3' });

    expect(result).toEqual({ user_id: 'user-3', rol: RoleType.ADVISER });
  });

  it('throws when no identifier is provided', () => {
    const useCase = new GetAuthUserUseCase();

    expect(() => useCase.execute({})).toThrow(UnauthorizedException);
  });
});
