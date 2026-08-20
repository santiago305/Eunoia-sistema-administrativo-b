import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSaleOrderSkuRecognitionCodes20260819090000
  implements MigrationInterface
{
  name = "CreateSaleOrderSkuRecognitionCodes20260819090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_sku_recognition_codes (
        recognition_code_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(20) NOT NULL,
        description varchar(180) NULL,
        is_active boolean NOT NULL DEFAULT true,
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid NULL,
        updated_by uuid NULL,
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_sale_order_sku_recognition_codes_code UNIQUE (code)
      )
    `);

    await queryRunner.query(`
      INSERT INTO sale_order_sku_recognition_codes (
        code,
        description,
        is_active,
        is_deleted
      )
      VALUES ('EVA', 'Código de reconocimiento inicial', true, false)
      ON CONFLICT (code) DO UPDATE SET
        is_active = true,
        is_deleted = false,
        deleted_at = NULL,
        updated_at = now()
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
          'sale_orders.sku_recognition_codes.view',
          'Ver códigos de reconocimiento',
          'Abrir y consultar los códigos usados al importar pedidos',
          'sale_orders',
          'sale_order_sku_recognition_codes',
          'view',
          'action',
          true
        ),
        (
          'sale_orders.sku_recognition_codes.manage',
          'Gestionar códigos de reconocimiento',
          'Crear, editar y eliminar códigos usados al importar pedidos',
          'sale_orders',
          'sale_order_sku_recognition_codes',
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
        'sale_orders.sku_recognition_codes.view',
        'sale_orders.sku_recognition_codes.manage'
      )
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS sale_order_sku_recognition_codes`);
  }
}
