import { MigrationInterface, QueryRunner } from "typeorm";

export class LinkPaymentSupplierDestination20260921180000 implements MigrationInterface {
  name = "LinkPaymentSupplierDestination20260921180000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_documents
      ADD COLUMN IF NOT EXISTS supplier_payment_destination_id uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_documents_supplier_destination
      ON payment_documents (supplier_payment_destination_id)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_payment_documents_supplier_destination'
        ) THEN
          ALTER TABLE payment_documents
          ADD CONSTRAINT fk_payment_documents_supplier_destination
          FOREIGN KEY (supplier_payment_destination_id)
          REFERENCES supplier_payment_destinations(supplier_payment_destination_id)
          ON DELETE RESTRICT;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_documents
      DROP CONSTRAINT IF EXISTS fk_payment_documents_supplier_destination
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_documents_supplier_destination`);
    await queryRunner.query(`
      ALTER TABLE payment_documents
      DROP COLUMN IF EXISTS supplier_payment_destination_id
    `);
  }
}
