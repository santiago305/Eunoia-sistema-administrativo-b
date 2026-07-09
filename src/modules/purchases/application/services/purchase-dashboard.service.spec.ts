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

  it("applies payment method filters only to payment document metrics in the summary", async () => {
    const { service, manager } = makeService([
      [{ totalPurchased: "150.50", drafts: "2", toApprove: "1", received: "3" }],
      [{ totalPaid: "80.25", paymentsToApprove: "4" }],
      [{ pending: "70.25", overdue: "10.00" }],
    ]);

    await service.summary({ paymentMethodId: "method-1", companyPaymentAccountId: "account-1" });

    const purchaseSql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    const purchaseParams = (manager.query as jest.Mock).mock.calls[0][1];
    const paymentSql = (manager.query as jest.Mock).mock.calls[1][0] as string;
    const paymentParams = (manager.query as jest.Mock).mock.calls[1][1];
    const payableSql = (manager.query as jest.Mock).mock.calls[2][0] as string;
    const payableParams = (manager.query as jest.Mock).mock.calls[2][1];

    expect(purchaseSql).toContain("FROM purchase_orders po");
    expect(purchaseSql).not.toContain("payment_documents");
    expect(purchaseParams).toEqual([]);
    expect(paymentSql).toContain("FROM payment_documents pd");
    expect(paymentSql).toContain("pd.payment_method_id");
    expect(paymentSql).toContain("pd.company_payment_account_id");
    expect(paymentParams).toEqual(["method-1", "account-1"]);
    expect(payableSql).toContain("FROM accounts_payable ap");
    expect(payableSql).not.toContain("payment_documents");
    expect(payableParams).toEqual([]);
  });

  it("returns top suppliers with numeric totals and display names", async () => {
    const { service } = makeService([
      [{ supplierId: "supplier-1", supplierName: "Comercial Norte", total: "340.90", count: "5" }],
    ]);

    await expect(service.topSuppliers({ purchaseType: "INVENTORY" })).resolves.toEqual([
      { supplierId: "supplier-1", supplierName: "Comercial Norte", total: 340.9, count: 5 },
    ]);
  });

  it("queries upcoming payments as pending or partial non-overdue accounts limited to 10 rows", async () => {
    const { service, manager } = makeService([
      [
        {
          accountPayableId: "payable-1",
          purchaseId: "purchase-1",
          supplierId: "supplier-1",
          supplierName: "Comercial Norte",
          dueDate: "2026-07-15",
          amountPending: "120.50",
          currency: "PEN",
          status: "PENDING",
        },
        {
          accountPayableId: "payable-2",
          purchaseId: "purchase-2",
          supplierId: null,
          supplierName: null,
          dueDate: null,
          amountPending: "80",
          currency: "USD",
          status: "PARTIAL",
        },
      ],
    ]);

    await expect(service.upcomingPayments({ supplierId: "supplier-1" })).resolves.toEqual([
      {
        accountPayableId: "payable-1",
        purchaseId: "purchase-1",
        supplierId: "supplier-1",
        supplierName: "Comercial Norte",
        dueDate: "2026-07-15",
        amountPending: 120.5,
        currency: "PEN",
        status: "PENDING",
      },
      {
        accountPayableId: "payable-2",
        purchaseId: "purchase-2",
        supplierId: null,
        supplierName: null,
        dueDate: null,
        amountPending: 80,
        currency: "USD",
        status: "PARTIAL",
      },
    ]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    const params = (manager.query as jest.Mock).mock.calls[0][1];
    expect(sql).toContain("FROM accounts_payable ap");
    expect(sql).toContain("ap.status IN ('PENDING', 'PARTIAL')");
    expect(sql).toContain("ap.due_date IS NULL OR ap.due_date >= CURRENT_DATE");
    expect(sql).toContain("ORDER BY ap.due_date ASC NULLS LAST, ap.amount_pending DESC");
    expect(sql).toContain("LIMIT 10");
    expect(params).toEqual(["supplier-1"]);
  });

  it("queries overdue payments by overdue status or due date before today", async () => {
    const { service, manager } = makeService([
      [
        {
          accountPayableId: "payable-1",
          purchaseId: "purchase-1",
          supplierId: "supplier-1",
          supplierName: "Comercial Norte",
          dueDate: "2026-07-01",
          amountPending: "240",
          currency: "PEN",
          status: "OVERDUE",
        },
        {
          accountPayableId: "payable-2",
          purchaseId: "purchase-2",
          supplierId: "supplier-1",
          supplierName: "Comercial Norte",
          dueDate: "2026-07-02",
          amountPending: "60.75",
          currency: "USD",
          status: "PENDING",
        },
      ],
    ]);

    await expect(service.overduePayments({ supplierId: "supplier-1" })).resolves.toEqual([
      {
        accountPayableId: "payable-1",
        purchaseId: "purchase-1",
        supplierId: "supplier-1",
        supplierName: "Comercial Norte",
        dueDate: "2026-07-01",
        amountPending: 240,
        currency: "PEN",
        status: "OVERDUE",
      },
      {
        accountPayableId: "payable-2",
        purchaseId: "purchase-2",
        supplierId: "supplier-1",
        supplierName: "Comercial Norte",
        dueDate: "2026-07-02",
        amountPending: 60.75,
        currency: "USD",
        status: "PENDING",
      },
    ]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    const params = (manager.query as jest.Mock).mock.calls[0][1];
    expect(sql).toContain("FROM accounts_payable ap");
    expect(sql).toContain("ap.status = 'OVERDUE' OR ap.due_date < CURRENT_DATE");
    expect(sql).toContain("ORDER BY ap.due_date ASC NULLS LAST, ap.amount_pending DESC");
    expect(sql).toContain("LIMIT 10");
    expect(params).toEqual(["supplier-1"]);
  });

  it("filters payment rows to accounts with pending amount greater than zero", async () => {
    const { service, manager } = makeService([[]]);

    await expect(service.upcomingPayments({})).resolves.toEqual([]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("ap.amount_pending > 0");
  });

  it("keeps payment document filters out of upcoming account payable rows", async () => {
    const { service, manager } = makeService([[]]);

    await expect(
      service.upcomingPayments({
        from: "2026-07-01",
        to: "2026-07-31",
        supplierId: "supplier-1",
        purchaseType: "INVENTORY",
        status: "RECEIVED",
        paymentStatus: "PARTIAL",
        userId: "user-1",
        warehouseId: "warehouse-1",
        paymentMethodId: "method-1",
        companyPaymentAccountId: "account-1",
      }),
    ).resolves.toEqual([]);

    const sql = (manager.query as jest.Mock).mock.calls[0][0] as string;
    const params = (manager.query as jest.Mock).mock.calls[0][1];
    expect(sql).toContain("FROM accounts_payable ap");
    expect(sql).toContain("DATE(COALESCE(po.date_issue, po.created_at)) >= $1");
    expect(sql).toContain("DATE(COALESCE(po.date_issue, po.created_at)) <= $2");
    expect(sql).toContain("po.supplier_id = $3");
    expect(sql).toContain("po.purchase_type = $4");
    expect(sql).toContain("po.status = $5");
    expect(sql).toContain("po.payment_status = $6");
    expect(sql).toContain("po.created_by = $7");
    expect(sql).toContain("po.warehouse_id = $8");
    expect(sql).not.toContain("payment_documents");
    expect(sql).not.toContain("payment_method_id");
    expect(sql).not.toContain("company_payment_account_id");
    expect(params).toEqual([
      "2026-07-01",
      "2026-07-31",
      "supplier-1",
      "INVENTORY",
      "RECEIVED",
      "PARTIAL",
      "user-1",
      "warehouse-1",
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
    expect(sql).not.toContain("pd_filter");
    expect(sql).not.toContain("pd_account_filter");
    expect(params).toEqual(["method-1", "account-1"]);
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
