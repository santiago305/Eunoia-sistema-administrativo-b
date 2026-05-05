import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';
import { AuthInvalidTokenError } from '../errors/auth-invalid-token.error';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';

@Injectable()
export class GetAuthUserUseCase {
  constructor(private readonly accessControlService: AccessControlService) {}

  async execute(user: { id?: string; sub?: string; role?: string }) {
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new UnauthorizedException(new AuthInvalidTokenError().message);
    }

    const roles = await this.accessControlService.getUserRoles(userId);
    const permissions = await this.accessControlService.getEffectivePermissions(userId);
    const preferredHomePath = await this.accessControlService.getUserPreferredHomePath(userId);

    return {
      user_id: userId,
      rol: user?.role || RoleType.ADVISER,
      roles,
      permissions,
      preferredHomePath,
    };
  }
}
