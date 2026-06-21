import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../adapters/out/persistence/typeorm/entities/permission.entity';
import { RolePermission } from '../../adapters/out/persistence/typeorm/entities/role-permission.entity';
import { PERMISSIONS_SEED } from '../../application/constants/permissions-seed';

export const DEPRECATED_PERMISSION_CODES = [
  'products.skus.create',
  'products.skus.update',
  'materials.skus.create',
  'materials.skus.update',
  'page.providers.view',
];

@Injectable()
export class AccessControlSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async onModuleInit() {
    await this.ensureAccessControlSchema();
    await this.seedPermissions();
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
    await this.permissionRepository
      .createQueryBuilder()
      .update(Permission)
      .set({ isActive: false })
      .where('code IN (:...codes)', { codes: DEPRECATED_PERMISSION_CODES })
      .execute();

    for (const permissionSeed of PERMISSIONS_SEED) {
      const exists = await this.permissionRepository.findOne({
        where: { code: permissionSeed.code },
      });
      if (exists) continue;
      const permission = this.permissionRepository.create(permissionSeed);
      await this.permissionRepository.save(permission);
    }
  }
}
