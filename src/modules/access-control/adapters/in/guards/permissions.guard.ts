import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../../../application/services/access-control.service';
import {
  DYNAMIC_PERMISSION_GROUPS_KEY,
  PERMISSION_GROUPS_KEY,
  PERMISSIONS_KEY,
  PermissionGroup,
  PermissionGroupsResolver,
} from '../decorators/require-permissions.decorator';

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
    const requiredPermissionGroups = this.reflector.getAllAndOverride<PermissionGroup[]>(PERMISSION_GROUPS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const dynamicPermissionGroupsResolver = this.reflector.getAllAndOverride<PermissionGroupsResolver>(
      DYNAMIC_PERMISSION_GROUPS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length && !requiredPermissionGroups?.length && !dynamicPermissionGroupsResolver) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string; sub?: string } | undefined;
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const effective = await this.accessControlService.getEffectivePermissions(userId);
    const effectiveSet = new Set(effective);
    const hasPermission = (permission: string) => effectiveSet.has('*') || effectiveSet.has(permission);

    const staticAllowed = !requiredPermissions?.length || requiredPermissions.every(hasPermission);
    const groupAllowed =
      !requiredPermissionGroups?.length ||
      requiredPermissionGroups.every((group) => group.some(hasPermission));
    const dynamicGroups = dynamicPermissionGroupsResolver?.({
      body: request.body,
      query: request.query,
      params: request.params,
    });
    const dynamicAllowed =
      !dynamicGroups?.length ||
      dynamicGroups.every((group) => group.some(hasPermission));

    if (!staticAllowed || !groupAllowed || !dynamicAllowed) {
      throw new ForbiddenException('Acceso denegado: permisos insuficientes');
    }

    return true;
  }
}

