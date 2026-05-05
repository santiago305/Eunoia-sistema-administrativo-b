import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../../../application/services/access-control.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string; sub?: string } | undefined;
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const allowed = await this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
    if (!allowed) {
      throw new ForbiddenException('Acceso denegado: permisos insuficientes');
    }

    return true;
  }
}

