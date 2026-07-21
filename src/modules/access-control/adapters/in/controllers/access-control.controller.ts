import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators';
import { AccessControlService } from '../../../application/services/access-control.service';
import { SetUserPermissionOverrideDto } from '../dtos/set-user-permission-override.dto';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { SetUserGrantablePermissionsDto } from '../dtos/set-user-grantable-permissions.dto';
import { CsrfGuard } from 'src/shared/utilidades/guards/csrf.guard';

@Controller('access-control')
@UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('permissions')
  @RequirePermissions('permissions.read')
  listPermissions() {
    return this.accessControlService.listPermissions();
  }

  @Get('users/:id/effective-permissions')
  @RequirePermissions('users.view_effective_permissions')
  async getEffectivePermissions(@Param('id') userId: string) {
    const permissions = await this.accessControlService.getEffectivePermissions(userId);
    const roles = await this.accessControlService.getUserRoles(userId);
    const overrides = await this.accessControlService.listUserPermissionOverrides(userId);
    const preferredHomePath = await this.accessControlService.getUserPreferredHomePath(userId);
    return { userId, roles, permissions, overrides, preferredHomePath };
  }

  @Get('users/:id/permission-overrides')
  @RequirePermissions('users.view_effective_permissions')
  getUserPermissionOverrides(@Param('id') userId: string) {
    return this.accessControlService.listUserPermissionOverrides(userId);
  }

  @Get('users/:id/grantable-permissions')
  @RequirePermissions('users.create', 'users.assign_permissions', 'users.manage_grantable_permissions')
  async listUserGrantablePermissions(@Param('id') userId: string) {
    const permissionCodes = await this.accessControlService.listGrantablePermissions(userId);
    return { userId, permissionCodes };
  }

  @Patch('users/:id/grantable-permissions')
  @RequirePermissions('users.create', 'users.assign_permissions', 'users.manage_grantable_permissions')
  setUserGrantablePermissions(
    @Param('id') userId: string,
    @Body() dto: SetUserGrantablePermissionsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.accessControlService.replaceGrantablePermissions({
      targetUserId: userId,
      permissionCodes: dto.permissionCodes ?? [],
      performedBy: user.id,
    });
  }

  @Post('users/:id/permissions')
  @RequirePermissions('users.assign_permissions')
  setUserPermissionOverride(
    @Param('id') userId: string,
    @Body() dto: SetUserPermissionOverrideDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.accessControlService.upsertUserPermissionOverride({
      userId,
      permissionCode: dto.permissionCode,
      effect: dto.effect,
      reason: dto.reason,
      createdBy: user.id,
    });
  }

  @Delete('users/:id/permissions/:permissionCode')
  @RequirePermissions('users.assign_permissions')
  removeUserPermissionOverride(
    @Param('id') userId: string,
    @Param('permissionCode') permissionCode: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.accessControlService.removeUserPermissionOverride(userId, permissionCode, user.id);
  }

  @Patch('roles/:roleId/permissions')
  @RequirePermissions('roles.assign_permissions')
  assignPermissionsToRole(
    @Param('roleId') roleId: string,
    @Body() body: { permissionCodes: string[] },
    @CurrentUser() user: { id: string },
  ) {
    return this.accessControlService.assignPermissionsToRole(
      roleId,
      body.permissionCodes ?? [],
      user.id,
    );
  }

  @Get('roles/:roleId/permissions')
  @RequirePermissions('roles.read')
  listRolePermissions(@Param('roleId') roleId: string) {
    return this.accessControlService.listRolePermissions(roleId);
  }

  @Patch('users/:id/preferred-home')
  @RequirePermissions('users.update')
  setUserPreferredHomePath(
    @Param('id') userId: string,
    @Body() body: { preferredHomePath?: string | null },
    @CurrentUser() user: { id: string },
  ) {
    const raw = String(body?.preferredHomePath ?? '').trim();
    const preferredHomePath = raw.length > 0 ? raw : null;
    return this.accessControlService.setUserPreferredHomePath({
      userId,
      preferredHomePath,
      performedBy: user.id,
    });
  }
}
