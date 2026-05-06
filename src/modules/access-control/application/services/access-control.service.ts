import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from 'src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { Permission } from '../../adapters/out/persistence/typeorm/entities/permission.entity';
import { RolePermission } from '../../adapters/out/persistence/typeorm/entities/role-permission.entity';
import { PermissionEffect, UserPermissionOverride } from '../../adapters/out/persistence/typeorm/entities/user-permission-override.entity';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(UserPermissionOverride)
    private readonly userPermissionOverrideRepository: Repository<UserPermissionOverride>,
  ) {}

  private async isUserSuperAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'isSuperAdmin'],
    });
    return Boolean(user?.isSuperAdmin);
  }

  async listPermissions() {
    return this.permissionRepository.find({
      where: { isActive: true },
      order: { module: 'ASC', resource: 'ASC', action: 'ASC' },
    });
  }

  async getUserPreferredHomePath(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'preferredHomePath'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user.preferredHomePath ?? null;
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.role?.description) return [];
    return [String(user.role.description).toLowerCase()];
  }

  async getEffectivePermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const roleDescription = String(user.role?.description ?? '').toLowerCase();
    const isSuperAdmin = Boolean(user.isSuperAdmin);

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId: user.role?.roleId },
      relations: ['permission'],
    });

    const fromRole = rolePermissions
      .map((rp) => rp.permission?.code)
      .filter((code): code is string => Boolean(code));

    const hasWildcard = fromRole.includes('*') || roleDescription === 'admin' || isSuperAdmin;
    if (hasWildcard) {
      const all = await this.permissionRepository.find({
        where: { isActive: true },
        select: ['code'],
      });
      return all.map((permission) => permission.code);
    }

    const overrides = await this.userPermissionOverrideRepository.find({
      where: { userId },
      relations: ['permission'],
    });

    const allowed = overrides
      .filter((item) => item.effect === 'ALLOW')
      .map((item) => item.permission?.code)
      .filter((code): code is string => Boolean(code));

    const denied = new Set(
      overrides
        .filter((item) => item.effect === 'DENY')
        .map((item) => item.permission?.code)
        .filter((code): code is string => Boolean(code)),
    );

    const effective = new Set([...fromRole, ...allowed].filter((code) => !denied.has(code)));
    return Array.from(effective).sort();
  }

  async listUserPermissionOverrides(userId: string) {
    const overrides = await this.userPermissionOverrideRepository.find({
      where: { userId },
      relations: ['permission'],
      order: { createdAt: 'DESC' },
    });

    return overrides.map((item) => ({
      id: item.id,
      permissionCode: item.permission?.code ?? null,
      effect: item.effect,
      reason: item.reason ?? null,
      createdBy: item.createdBy ?? null,
      createdAt: item.createdAt,
    }));
  }

  async setUserPreferredHomePath(params: {
    userId: string;
    preferredHomePath: string | null;
    performedBy?: string;
  }) {
    const target = await this.userRepository.findOne({
      where: { id: params.userId },
      select: ['id', 'isSuperAdmin', 'preferredHomePath'],
    });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (target.isSuperAdmin) {
      const actorIsSuperAdmin = await this.isUserSuperAdmin(params.performedBy);
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          'Solo un super administrador puede modificar preferencias de otro super administrador',
        );
      }
    }

    target.preferredHomePath = params.preferredHomePath;
    await this.userRepository.save(target);
    return { userId: target.id, preferredHomePath: target.preferredHomePath ?? null };
  }

  async userHasAllPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
    if (!requiredPermissions?.length) return true;
    const effective = await this.getEffectivePermissions(userId);
    return requiredPermissions.every((permission) => effective.includes(permission));
  }

  async getUserIdsWithPermission(permissionCode: string): Promise<string[]> {
    const users = await this.userRepository.find({
      where: { deleted: false },
      select: ['id'],
    });

    const userIds: string[] = [];
    for (const user of users) {
      const allowed = await this.userHasAllPermissions(user.id, [permissionCode]);
      if (allowed) {
        userIds.push(user.id);
      }
    }
    return userIds;
  }

  async upsertUserPermissionOverride(params: {
    userId: string;
    permissionCode: string;
    effect: PermissionEffect;
    createdBy?: string;
    reason?: string;
  }) {
    const targetIsSuperAdmin = await this.isUserSuperAdmin(params.userId);
    if (targetIsSuperAdmin) {
      const actorIsSuperAdmin = await this.isUserSuperAdmin(params.createdBy);
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          'Solo un super administrador puede modificar permisos de otro super administrador',
        );
      }
    }

    const permission = await this.permissionRepository.findOne({
      where: { code: params.permissionCode },
    });
    if (!permission) {
      throw new NotFoundException(`Permiso no encontrado: ${params.permissionCode}`);
    }

    const existing = await this.userPermissionOverrideRepository.findOne({
      where: {
        userId: params.userId,
        permissionId: permission.id,
      },
    });

    if (existing) {
      existing.effect = params.effect;
      existing.reason = params.reason;
      existing.createdBy = params.createdBy;
      await this.userPermissionOverrideRepository.save(existing);
      return existing;
    }

    const entity = this.userPermissionOverrideRepository.create({
      userId: params.userId,
      permissionId: permission.id,
      effect: params.effect,
      reason: params.reason,
      createdBy: params.createdBy,
    });
    return this.userPermissionOverrideRepository.save(entity);
  }

  async removeUserPermissionOverride(
    userId: string,
    permissionCode: string,
    performedBy?: string,
  ) {
    const targetIsSuperAdmin = await this.isUserSuperAdmin(userId);
    if (targetIsSuperAdmin) {
      const actorIsSuperAdmin = await this.isUserSuperAdmin(performedBy);
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          'Solo un super administrador puede modificar permisos de otro super administrador',
        );
      }
    }

    const permission = await this.permissionRepository.findOne({
      where: { code: permissionCode },
      select: ['id', 'code'],
    });
    if (!permission) return;

    await this.userPermissionOverrideRepository.delete({
      userId,
      permissionId: permission.id,
    });
  }

  async assignPermissionsToRole(
    roleId: string,
    permissionCodes: string[],
    performedBy?: string,
  ) {
    const role = await this.roleRepository.findOne({ where: { roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const isAdminRole = String(role.description ?? '').trim().toLowerCase() === 'admin';
    if (isAdminRole) {
      const actorIsSuperAdmin = await this.isUserSuperAdmin(performedBy);
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          'Solo un super administrador puede modificar permisos del rol admin',
        );
      }
    }

    const permissions = await this.permissionRepository.find({
      where: { code: In(permissionCodes) },
      select: ['id', 'code'],
    });
    const foundCodes = new Set(permissions.map((permission) => permission.code));
    const missing = permissionCodes.filter((code) => !foundCodes.has(code));
    if (missing.length) {
      throw new NotFoundException(`Permisos no encontrados: ${missing.join(', ')}`);
    }

    await this.rolePermissionRepository.delete({ roleId });
    const entities = permissions.map((permission) =>
      this.rolePermissionRepository.create({
        roleId,
        permissionId: permission.id,
      }),
    );
    await this.rolePermissionRepository.save(entities);
  }

  async listRolePermissions(roleId: string) {
    const role = await this.roleRepository.findOne({ where: { roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
      order: { createdAt: 'ASC' },
    });

    return {
      roleId,
      roleDescription: role.description,
      permissions: rolePermissions
        .map((item) => item.permission?.code)
        .filter((code): code is string => Boolean(code))
        .sort(),
    };
  }
}
