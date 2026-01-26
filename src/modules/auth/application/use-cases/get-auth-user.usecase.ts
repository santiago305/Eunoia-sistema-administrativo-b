import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class GetAuthUserUseCase {
  execute(user: { id?: string; sub?: string; role?: string }) {
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    return {
      user_id: userId,
      rol: user?.role || RoleType.ADVISER,
    };
  }
}
