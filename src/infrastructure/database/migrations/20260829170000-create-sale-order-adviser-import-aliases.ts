import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaleOrderAdviserImportAliases20260829170000
  implements MigrationInterface
{
  name = 'CreateSaleOrderAdviserImportAliases20260829170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_adviser_import_aliases (
        adviser_import_alias_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        external_name varchar(160) NOT NULL,
        normalized_name varchar(160) NOT NULL,
        adviser_user_id uuid NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid NULL,
        updated_by uuid NULL,
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_sale_order_adviser_import_aliases_normalized_name
          UNIQUE (normalized_name),
        CONSTRAINT fk_sale_order_adviser_import_aliases_adviser
          FOREIGN KEY (adviser_user_id)
          REFERENCES advisers(user_id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_sale_order_adviser_import_aliases_adviser
      ON sale_order_adviser_import_aliases (adviser_user_id)
    `);

    await queryRunner.query(`
      INSERT INTO permissions (
        code,
        name,
        description,
        module,
        resource,
        action,
        type,
        is_active
      )
      VALUES
        (
          'sale_orders.adviser_import_aliases.view',
          'Ver equivalencias de asesores de importación',
          'Abrir y consultar los nombres externos relacionados con asesores',
          'sale_orders',
          'sale_order_adviser_import_aliases',
          'view',
          'action',
          true
        ),
        (
          'sale_orders.adviser_import_aliases.manage',
          'Gestionar equivalencias de asesores de importación',
          'Crear, editar, activar y eliminar relaciones entre nombres externos y asesores',
          'sale_orders',
          'sale_order_adviser_import_aliases',
          'manage',
          'action',
          true
        )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN (
        'sale_orders.adviser_import_aliases.view',
        'sale_orders.adviser_import_aliases.manage'
      )
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS sale_order_adviser_import_aliases`,
    );
  }
}
