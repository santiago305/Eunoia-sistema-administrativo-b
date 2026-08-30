import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryTransferTransit20260830110000 implements MigrationInterface {
  name = 'AddInventoryTransferTransit20260830110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE pc_inventory_documents ALTER COLUMN status DROP DEFAULT`);
    await queryRunner.query(`ALTER TYPE inv_doc_status RENAME TO inv_doc_status_without_transit`);
    await queryRunner.query(`CREATE TYPE inv_doc_status AS ENUM ('DRAFT', 'IN_TRANSIT', 'POSTED', 'CANCELLED')`);
    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
      ALTER COLUMN status TYPE inv_doc_status
      USING status::text::inv_doc_status
    `);
    await queryRunner.query(`ALTER TABLE pc_inventory_documents ALTER COLUMN status SET DEFAULT 'DRAFT'`);
    await queryRunner.query(`DROP TYPE inv_doc_status_without_transit`);

    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
        ADD COLUMN IF NOT EXISTS scheduled_departure_date date NULL,
        ADD COLUMN IF NOT EXISTS expected_arrival_date date NULL,
        ADD COLUMN IF NOT EXISTS dispatched_by uuid NULL REFERENCES users(user_id),
        ADD COLUMN IF NOT EXISTS dispatched_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS received_by uuid NULL REFERENCES users(user_id),
        ADD COLUMN IF NOT EXISTS received_at timestamptz NULL
    `);

    await queryRunner.query(`
      UPDATE pc_inventory_documents
      SET
        scheduled_departure_date = COALESCE(
          scheduled_departure_date,
          (created_at AT TIME ZONE 'America/Lima')::date
        ),
        expected_arrival_date = COALESCE(
          expected_arrival_date,
          (COALESCE(posted_at, created_at) AT TIME ZONE 'America/Lima')::date
        ),
        dispatched_by = CASE WHEN status = 'POSTED' THEN COALESCE(dispatched_by, posted_by) ELSE dispatched_by END,
        dispatched_at = CASE WHEN status = 'POSTED' THEN COALESCE(dispatched_at, posted_at) ELSE dispatched_at END,
        received_by = CASE WHEN status = 'POSTED' THEN COALESCE(received_by, posted_by) ELSE received_by END,
        received_at = CASE WHEN status = 'POSTED' THEN COALESCE(received_at, posted_at) ELSE received_at END
      WHERE doc_type = 'TRANSFER'
    `);

    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
      ADD CONSTRAINT chk_pc_inventory_transfer_dates
      CHECK (
        doc_type <> 'TRANSFER'
        OR (
          scheduled_departure_date IS NOT NULL
          AND expected_arrival_date IS NOT NULL
          AND expected_arrival_date >= scheduled_departure_date
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pc_inventory_transfer_transit_arrival
      ON pc_inventory_documents (expected_arrival_date)
      WHERE doc_type = 'TRANSFER' AND status = 'IN_TRANSIT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pc_inventory_transfer_transit_arrival`);
    await queryRunner.query(`ALTER TABLE pc_inventory_documents DROP CONSTRAINT IF EXISTS chk_pc_inventory_transfer_dates`);
    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
        DROP COLUMN IF EXISTS received_at,
        DROP COLUMN IF EXISTS received_by,
        DROP COLUMN IF EXISTS dispatched_at,
        DROP COLUMN IF EXISTS dispatched_by,
        DROP COLUMN IF EXISTS expected_arrival_date,
        DROP COLUMN IF EXISTS scheduled_departure_date
    `);

    await queryRunner.query(`UPDATE pc_inventory_documents SET status = 'DRAFT' WHERE status = 'IN_TRANSIT'`);
    await queryRunner.query(`ALTER TABLE pc_inventory_documents ALTER COLUMN status DROP DEFAULT`);
    await queryRunner.query(`ALTER TYPE inv_doc_status RENAME TO inv_doc_status_with_transit`);
    await queryRunner.query(`CREATE TYPE inv_doc_status AS ENUM ('DRAFT', 'POSTED', 'CANCELLED')`);
    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
      ALTER COLUMN status TYPE inv_doc_status
      USING status::text::inv_doc_status
    `);
    await queryRunner.query(`ALTER TABLE pc_inventory_documents ALTER COLUMN status SET DEFAULT 'DRAFT'`);
    await queryRunner.query(`DROP TYPE inv_doc_status_with_transit`);
  }
}
