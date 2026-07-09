import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseDashboardIndexes20260709010000 implements MigrationInterface {
  name = "AddPurchaseDashboardIndexes20260709010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_dashboard_po_created_at ON purchase_orders (created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_dashboard_po_date_issue ON purchase_orders (date_issue);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_dashboard_po_supplier_id ON purchase_orders (supplier_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_dashboard_ap_amount_pending ON accounts_payable (amount_pending);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_dashboard_pd_date ON payment_documents (date);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_dashboard_pd_status ON payment_documents (status);`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_dashboard_pd_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_dashboard_pd_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_dashboard_ap_amount_pending;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_dashboard_po_supplier_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_dashboard_po_date_issue;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_dashboard_po_created_at;`);
  }
}
