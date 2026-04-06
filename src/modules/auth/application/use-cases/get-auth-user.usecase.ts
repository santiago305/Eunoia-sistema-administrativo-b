import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';
import { AuthInvalidTokenError } from '../errors/auth-invalid-token.error';

@Injectable()
export class GetAuthUserUseCase {
  execute(user: { id?: string; sub?: string; role?: string }) {
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new UnauthorizedException(new AuthInvalidTokenError().message);
    }

    return {
      user_id: userId,
      rol: user?.role || RoleType.ADVISER,
    };
  }
}
