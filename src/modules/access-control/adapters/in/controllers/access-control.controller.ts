import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { Roles, User as CurrentUser } from 'src/shared/utilidades/decorators';
import { RoleType } from 'src/shared/constantes/constants';
import { AccessControlService } from '../../../application/services/access-control.service';
import { SetUserPermissionOverrideDto } from '../dtos/set-user-permission-override.dto';

@Controller('access-control')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('permissions')
  listPermissions() {
    return this.accessControlService.listPermissions();
  }

  @Get('users/:id/effective-permissions')
  async getEffectivePermissions(@Param('id') userId: string) {
    const permissions = await this.accessControlService.getEffectivePermissions(userId);
    const roles = await this.accessControlService.getUserRoles(userId);
    const overrides = await this.accessControlService.listUserPermissionOverrides(userId);
    const preferredHomePath = await this.accessControlService.getUserPreferredHomePath(userId);
    return { userId, roles, permissions, overrides, preferredHomePath };
  }

  @Get('users/:id/permission-overrides')
  getUserPermissionOverrides(@Param('id') userId: string) {
    return this.accessControlService.listUserPermissionOverrides(userId);
  }

  @Post('users/:id/permissions')
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
  removeUserPermissionOverride(
    @Param('id') userId: string,
    @Param('permissionCode') permissionCode: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.accessControlService.removeUserPermissionOverride(userId, permissionCode, user.id);
  }

  @Patch('roles/:roleId/permissions')
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
  listRolePermissions(@Param('roleId') roleId: string) {
    return this.accessControlService.listRolePermissions(roleId);
  }

  @Patch('users/:id/preferred-home')
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
