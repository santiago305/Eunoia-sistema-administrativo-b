import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientsNoneDocType20260520020000 implements MigrationInterface {
  name = "AddClientsNoneDocType20260520020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_type') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'client_type' AND e.enumlabel = 'UNDEFINED'
          ) THEN
            ALTER TYPE client_type ADD VALUE 'UNDEFINED';
          END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_type_client') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'doc_type_client' AND e.enumlabel = 'NONE'
          ) THEN
            ALTER TYPE doc_type_client ADD VALUE 'NONE';
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'clients' AND column_name = 'doc_number'
        ) THEN
          ALTER TABLE clients ALTER COLUMN doc_number DROP NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}

