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
    await this.ensureAccessControlSchema();
    await this.seedPermissions();
    await this.seedRolePermissions();
  }

  private async ensureAccessControlSchema() {
    await this.permissionRepository.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar NOT NULL UNIQUE,
        name varchar NOT NULL,
        description varchar NULL,
        module varchar NULL,
        resource varchar NULL,
        action varchar NULL,
        type varchar NOT NULL DEFAULT 'action',
        is_system boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await this.rolePermissionRepository.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id uuid NOT NULL,
        permission_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await this.rolePermissionRepository.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_role_permissions_role_permission'
        ) THEN
          ALTER TABLE role_permissions
          ADD CONSTRAINT uq_role_permissions_role_permission
          UNIQUE (role_id, permission_id);
        END IF;
      END $$;
    `);

    await this.rolePermissionRepository.query(`
      DO $$
      BEGIN
        IF to_regclass('public.roles') IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
             FROM pg_constraint
             WHERE conname = 'fk_role_permissions_role'
           ) THEN
          ALTER TABLE role_permissions
          ADD CONSTRAINT fk_role_permissions_role
          FOREIGN KEY (role_id)
          REFERENCES roles(role_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await this.rolePermissionRepository.query(`
      DO $$
      BEGIN
        IF to_regclass('public.permissions') IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
             FROM pg_constraint
             WHERE conname = 'fk_role_permissions_permission'
           ) THEN
          ALTER TABLE role_permissions
          ADD CONSTRAINT fk_role_permissions_permission
          FOREIGN KEY (permission_id)
          REFERENCES permissions(permission_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await this.rolePermissionRepository.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id
      ON role_permissions(role_id);
    `);

    await this.rolePermissionRepository.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
      ON role_permissions(permission_id);
    `);
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

      const existingRolePermissions = await this.rolePermissionRepository.find({
        where: { roleId: role.roleId },
        relations: ['permission'],
      });
      const existingCodes = new Set(
        existingRolePermissions
          .map((item) => item.permission?.code)
          .filter((code): code is string => Boolean(code)),
      );

      for (const permission of permissions) {
        if (existingCodes.has(permission.code)) continue;
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
