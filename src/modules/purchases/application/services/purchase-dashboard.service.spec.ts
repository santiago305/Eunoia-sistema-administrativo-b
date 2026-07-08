import { EntityManager } from "typeorm";
import { PurchaseDashboardService } from "./purchase-dashboard.service";

describe("PurchaseDashboardService", () => {
  const makeService = (rowsByCall: unknown[][]) => {
    const manager = {
      query: jest.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? [])),
    } as unknown as EntityManager;

    return {
      service: new PurchaseDashboardService(manager),
      manager,
    };
  };

  it("builds the summary from purchases, approved payments and accounts payable", async () => {
    const { service, manager } = makeService([
      [{ totalPurchased: "150.50", drafts: "2", toApprove: "1", received: "3" }],
      [{ totalPaid: "80.25", paymentsToApprove: "4" }],
      [{ pending: "70.25", overdue: "10.00" }],
    ]);

    await expect(service.summary({ from: "2026-06-01", to: "2026-06-30", supplierId: "supplier-1" })).resolves.toEqual({
      totalPurchased: 150.5,
      totalPaid: 80.25,
      pending: 70.25,
      overdue: 10,
      drafts: 2,
      toApprove: 1,
      paymentsToApprove: 4,
      received: 3,
    });

    expect(manager.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM purchase_orders po"),
      ["2026-06-01", "2026-06-30", "supplier-1"],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM payment_documents pd"),
      ["2026-06-01", "2026-06-30", "supplier-1"],
    );
    const paymentSummarySql = (manager.query as jest.Mock).mock.calls[1][0] as string;
    expect(paymentSummarySql).toContain("SUM(pd.amount) FILTER (WHERE pd.status = 'APPROVED')");
    expect(paymentSummarySql).toContain("COUNT(*) FILTER (WHERE pd.status = 'PENDING_APPROVAL')");
    expect(paymentSummarySql).not.toContain("AND pd.status = 'APPROVED'");
    expect(manager.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("FROM accounts_payable ap"),
      ["2026-06-01", "2026-06-30", "supplier-1"],
    );
  });

  it("returns top suppliers with numeric totals and display names", async () => {
    const { service } = makeService([
      [{ supplierId: "supplier-1", supplierName: "Comercial Norte", total: "340.90", count: "5" }],
    ]);

    await expect(service.topSuppliers({ purchaseType: "INVENTORY" })).resolves.toEqual([
      { supplierId: "supplier-1", supplierName: "Comercial Norte", total: 340.9, count: 5 },
    ]);
  });

  it("resolves top item labels from catalog names instead of stock item ids", async () => {
    const { service, manager } = makeService([
      [{ itemId: "stock-item-1", label: "Jabón de cúrcuma", itemType: "RAW_MATERIAL", total: "55.50", quantity: "3" }],
    ]);

    await expect(service.topItems({})).resolves.toEqual([
      { itemId: "stock-item-1", label: "Jabón de cúrcuma", itemType: "RAW_MATERIAL", total: 55.5, quantity: 3 },
    ]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("LEFT JOIN pc_stock_items psi ON psi.stock_item_id = poi.stock_item_id");
    expect(sql).toContain("LEFT JOIN pc_skus sku ON sku.sku_id = psi.sku_id");
    expect(sql).toContain("LEFT JOIN pc_products product ON product.product_id = sku.product_id");
    expect(sql).toContain("NULLIF(sku.name, '')");
    expect(sql).toContain("NULLIF(product.name, '')");
  });

  it("uses payment filters against payment documents for method usage", async () => {
    const { service, manager } = makeService([
      [{ label: "Transferencia", value: "40", count: "2" }],
    ]);

    await expect(service.paymentMethodUsage({ paymentMethodId: "method-1", companyPaymentAccountId: "account-1" })).resolves.toEqual([
      { label: "Transferencia", value: 40, count: 2 },
    ]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    const params = (manager.query as jest.Mock).mock.calls[0][1];
    expect(sql).toContain("pd.payment_method_id");
    expect(sql).toContain("pd.company_payment_account_id");
    expect(params).toEqual(["method-1", "account-1", "method-1", "account-1"]);
  });

  it("keeps monthly spending SQL parameters aligned across purchased and paid CTEs", async () => {
    const { service, manager } = makeService([
      [{ month: "2026-06", purchased: "120", paid: "80" }],
    ]);

    await expect(service.monthlySpending({ from: "2026-06-01", to: "2026-06-30" })).resolves.toEqual([
      { month: "2026-06", purchased: 120, paid: 80 },
    ]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    const params = (manager.query as jest.Mock).mock.calls[0][1];
    expect(sql).toContain("$1");
    expect(sql).toContain("$2");
    expect(sql).toContain("$3");
    expect(sql).toContain("$4");
    expect(params).toEqual(["2026-06-01", "2026-06-30", "2026-06-01", "2026-06-30"]);
  });
});
