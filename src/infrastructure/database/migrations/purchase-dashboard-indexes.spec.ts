import { QueryRunner } from "typeorm";
import { AddPurchaseDashboardIndexes20260709010000 } from "./20260709010000-add-purchase-dashboard-indexes";

describe("AddPurchaseDashboardIndexes20260709010000", () => {
  it("adds only the missing dashboard indexes and can drop them safely", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;
    const migration = new AddPurchaseDashboardIndexes20260709010000();

    await migration.up(queryRunner);
    const upSql = queries.join("\n");

    expect(upSql).toContain("idx_purchase_dashboard_po_created_at");
    expect(upSql).toContain("purchase_orders (created_at)");
    expect(upSql).toContain("idx_purchase_dashboard_po_date_issue");
    expect(upSql).toContain("purchase_orders (date_issue)");
    expect(upSql).toContain("idx_purchase_dashboard_po_supplier_id");
    expect(upSql).toContain("purchase_orders (supplier_id)");
    expect(upSql).toContain("idx_purchase_dashboard_ap_amount_pending");
    expect(upSql).toContain("accounts_payable (amount_pending)");
    expect(upSql).toContain("idx_purchase_dashboard_pd_date");
    expect(upSql).toContain("payment_documents (date)");
    expect(upSql).toContain("idx_purchase_dashboard_pd_status");
    expect(upSql).toContain("payment_documents (status)");
    expect(upSql).not.toContain("idx_purchase_orders_purchase_type");
    expect(upSql).not.toContain("idx_purchase_orders_payment_status");
    expect(upSql).not.toContain("idx_accounts_payable_due_date");
    expect(upSql).not.toContain("idx_accounts_payable_status");

    queries.length = 0;
    await migration.down(queryRunner);
    const downSql = queries.join("\n");

    expect(downSql).toContain("DROP INDEX IF EXISTS idx_purchase_dashboard_pd_status");
    expect(downSql).toContain("DROP INDEX IF EXISTS idx_purchase_dashboard_pd_date");
    expect(downSql).toContain("DROP INDEX IF EXISTS idx_purchase_dashboard_ap_amount_pending");
    expect(downSql).toContain("DROP INDEX IF EXISTS idx_purchase_dashboard_po_supplier_id");
    expect(downSql).toContain("DROP INDEX IF EXISTS idx_purchase_dashboard_po_date_issue");
    expect(downSql).toContain("DROP INDEX IF EXISTS idx_purchase_dashboard_po_created_at");
    expect(downSql).not.toContain("DROP INDEX IF EXISTS idx_purchase_orders_purchase_type");
    expect(downSql).not.toContain("DROP INDEX IF EXISTS idx_accounts_payable_due_date");
  });
});
