import { QueryRunner } from "typeorm";
import { AlignPurchaseApprovalAndSupplierSkuSchema20260717100000 } from "./20260717100000-align-purchase-approval-and-supplier-sku-schema";

describe("AlignPurchaseApprovalAndSupplierSkuSchema20260717100000", () => {
  it("aligns legacy purchase approval/history and supplier sku tables", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;
    const migration = new AlignPurchaseApprovalAndSupplierSkuSchema20260717100000();

    await migration.up(queryRunner);
    const sql = queries.join("\n");

    expect(sql).toContain("ALTER TABLE supplier_skus");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS supplier_sku varchar(80)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS last_cost numeric(12,2)");
    expect(sql).toContain("ALTER TABLE approval_requests");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS approval_request_id uuid");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS payload_snapshot jsonb");
    expect(sql).toContain("column_name = 'id'");
    expect(sql).toContain("ALTER TABLE purchase_history_events");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS purchase_history_event_id uuid");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS performed_by_user_id uuid");
    expect(sql).toContain("column_name = 'created_by'");
    expect(sql).toContain("ALTER TABLE purchase_processing_approvals");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS approval_id uuid");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS po_id uuid");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS review_comment text");
  });
});
