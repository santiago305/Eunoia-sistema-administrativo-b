import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from 'src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { Permission } from '../../adapters/out/persistence/typeorm/entities/permission.entity';
import { RolePermission } from '../../adapters/out/persistence/typeorm/entities/role-permission.entity';
import { PERMISSIONS_SEED, ROLE_PERMISSION_SEED } from '../../application/constants/permissions-seed';

@Injectable()
export class AccessControlSeeder implements OnModuleInit {
  private readonly logger = new Logger(AccessControlSeeder.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedRolePermissions();
  }

  private async seedPermissions() {
    for (const permissionSeed of PERMISSIONS_SEED) {
      const exists = await this.permissionRepository.findOne({
        where: { code: permissionSeed.code },
      });
      if (exists) continue;
      const permission = this.permissionRepository.create(permissionSeed);
      await this.permissionRepository.save(permission);
    }
  }

  private async seedRolePermissions() {
    const roles = await this.roleRepository.find();
    if (!roles.length) return;

    for (const role of roles) {
      const roleKey = String(role.description ?? '').toLowerCase();
      const roleCodes = ROLE_PERMISSION_SEED[roleKey];
      if (!roleCodes?.length) continue;

      const existing = await this.rolePermissionRepository.count({
        where: { roleId: role.roleId },
      });
      if (existing > 0) continue;

      if (roleCodes.includes('*')) {
        const wildcardPermission = await this.permissionRepository.findOne({
          where: { code: '*' },
        });
        if (!wildcardPermission) {
          const created = this.permissionRepository.create({
            code: '*',
            name: 'Super permiso global',
            description: 'Acceso global a todos los permisos',
            module: 'system',
            resource: 'all',
            action: 'all',
            type: 'action',
          });
          await this.permissionRepository.save(created);
        }
      }

      const permissions = await this.permissionRepository.find({
        where: roleCodes.map((code) => ({ code })),
      });

      for (const permission of permissions) {
        const entity = this.rolePermissionRepository.create({
          roleId: role.roleId,
          permissionId: permission.id,
        });
        await this.rolePermissionRepository.save(entity);
      }
    }

    this.logger.log('Seed de access-control aplicado');
  }
}

