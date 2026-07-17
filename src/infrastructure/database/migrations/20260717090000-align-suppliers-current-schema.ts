import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignSuppliersCurrentSchema20260717090000 implements MigrationInterface {
  name = "AlignSuppliersCurrentSchema20260717090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_doc_type') THEN
          CREATE TYPE supplier_doc_type AS ENUM ('06', '01', '04');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS document_type supplier_doc_type,
      ADD COLUMN IF NOT EXISTS document_number varchar(30),
      ADD COLUMN IF NOT EXISTS last_name varchar(160),
      ADD COLUMN IF NOT EXISTS trade_name varchar(200),
      ADD COLUMN IF NOT EXISTS note text,
      ADD COLUMN IF NOT EXISTS lead_time_days int;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'suppliers' AND column_name = 'doc_type'
        ) THEN
          UPDATE suppliers
          SET document_type = CASE
            WHEN doc_type IN ('06', 'RUC') THEN '06'::supplier_doc_type
            WHEN doc_type IN ('01', 'DNI') THEN '01'::supplier_doc_type
            WHEN doc_type IN ('04', 'CE') THEN '04'::supplier_doc_type
            ELSE COALESCE(document_type, '06'::supplier_doc_type)
          END
          WHERE document_type IS NULL;
        ELSE
          UPDATE suppliers
          SET document_type = '06'::supplier_doc_type
          WHERE document_type IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'suppliers' AND column_name = 'doc_number'
        ) THEN
          UPDATE suppliers
          SET document_number = COALESCE(
            NULLIF(document_number, ''),
            NULLIF(doc_number, ''),
            'SIN' || left(replace(supplier_id::text, '-', ''), 22)
          )
          WHERE document_number IS NULL OR document_number = '';
        ELSE
          UPDATE suppliers
          SET document_number = 'SIN' || left(replace(supplier_id::text, '-', ''), 22)
          WHERE document_number IS NULL OR document_number = '';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      WITH duplicated AS (
        SELECT
          supplier_id,
          row_number() OVER (
            PARTITION BY document_type, document_number
            ORDER BY created_at, supplier_id
          ) AS duplicate_number
        FROM suppliers
      )
      UPDATE suppliers s
      SET document_number = left(s.document_number, 24) || '-' || duplicated.duplicate_number::text
      FROM duplicated
      WHERE s.supplier_id = duplicated.supplier_id
        AND duplicated.duplicate_number > 1;
    `);

    await queryRunner.query(`ALTER TABLE suppliers ALTER COLUMN document_type SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE suppliers ALTER COLUMN document_number SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE suppliers ALTER COLUMN name DROP NOT NULL;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_document
      ON suppliers (document_type, document_number);
    `);
  }

  public async down(): Promise<void> {
    // Additive alignment migration. Keep production supplier data intact.
  }
}
