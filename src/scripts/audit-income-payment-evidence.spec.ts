import { auditIncomePaymentEvidence } from "../../scripts/audit-income-payment-evidence";

describe("audit-income-payment-evidence", () => {
  it("reports stale operations, missing referenced files, and storage orphans without mutating anything", async () => {
    const staleOperations = [
      { id: "operation-promoted", status: "PROMOTED", staging_key: null, promoted_key: "private/sale-order-attachments/order-1/promoted.webp" },
      { id: "operation-staged-missing", status: "STAGED", staging_key: "staging/sale-order-attachments/order-2/staged.webp", promoted_key: null },
      { id: "operation-promoted-with-stale-stage-key", status: "PROMOTED", staging_key: "staging/sale-order-attachments/order-2/already-moved.webp", promoted_key: "private/sale-order-attachments/order-2/already-moved.webp" },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("payment_evidence_upload_operations") && sql.includes("updated_at <=")) return staleOperations;
      if (sql.includes("payment_evidence_upload_operations") && sql.includes("staging_key IS NOT NULL OR")) {
        return [
          { staging_key: null, promoted_key: "private/sale-order-attachments/order-1/promoted.webp" },
          { staging_key: "staging/sale-order-attachments/order-2/staged.webp", promoted_key: null },
          { staging_key: "staging/sale-order-attachments/order-2/already-moved.webp", promoted_key: "private/sale-order-attachments/order-2/already-moved.webp" },
        ];
      }
      if (sql.includes("FROM sale_order_attachments")) {
        return [
          { storage_path: "private/sale-order-attachments/order-1/linked.webp" },
          { storage_path: "private/sale-order-attachments/order-1/missing.webp" },
        ];
      }
      return [];
    });
    const list = jest.fn(async (area: string) => area === "private"
      ? [
          "private/sale-order-attachments/order-1/linked.webp",
          "private/sale-order-attachments/order-1/promoted.webp",
          "private/sale-order-attachments/order-2/already-moved.webp",
          "private/sale-order-attachments/order-1/orphan.webp",
        ]
      : ["staging/sale-order-attachments/order-3/orphan.webp"]);

    const result = await auditIncomePaymentEvidence({ query } as never, { list } as never);
    const counts = Object.fromEntries(result.map(({ check, count }) => [check, count]));

    expect(counts).toMatchObject({
      stale_evidence_upload_operations: 3,
      evidence_storage_inventory_available: 0,
      missing_private_payment_evidence_files: 1,
      orphan_private_payment_evidence_files: 1,
      orphan_staged_payment_evidence_files: 1,
      stale_upload_operations_with_missing_files: 1,
    });
    expect(query).toHaveBeenCalledTimes(7);
    expect(list).toHaveBeenCalledWith("private", "sale-order-attachments");
    expect(list).toHaveBeenCalledWith("staging", "sale-order-attachments");
  });

  it("treats unavailable file inventories as a blocking strict-audit check", async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("updated_at <=")) return [];
      if (sql.includes("payment_evidence_upload_operations")) return [];
      return [];
    });
    const result = await auditIncomePaymentEvidence({ query } as never, { list: undefined } as never);

    expect(result).toContainEqual({ check: "evidence_storage_inventory_available", count: 1, blocking: true });
    expect(result.some(({ check }) => check === "orphan_private_payment_evidence_files")).toBe(false);
  });
});
