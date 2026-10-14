import { collectFinancialAudit, financialCompanyScopeAuditQueries, financialLedgerAuditQueries, financialLifecyclePreflightQueries } from "../../scripts/audit-financial-data";

describe("audit-financial-data lifecycle preflight", () => {
  it("reports unclassified legacy states and normalized operation duplicates without writing", async () => {
    const legacyVoid = {
      id: "payment-voided",
      status: "VOIDED",
      voided_at: null,
      void_reason: null,
    };
    const unknownLifecycle = { id: "payment-approved", status: "APPROVED" };
    const duplicateOperation = {
      normalized_reference: "op-duplicate",
      total: 2,
      payments: [
        { id: "payment-one", status: "POSTED" },
        { id: "payment-two", status: "VOIDED" },
      ],
    };
    const pendingMissingMethod = { id: "pending-no-method", sale_order_id: "order-1", payment_method_id: null };
    const pendingInvalidReceiver = { id: "pending-no-receiver", sale_order_id: "order-2", company_payment_account_id: null };
    const pendingMissingReference = { id: "pending-no-reference", sale_order_id: "order-3", payment_method_code: "BANK_TRANSFER" };
    const currencyMismatch = { id: "posted-currency-mismatch", status: "POSTED", payment_currency: "USD", order_currency: "PEN" };
    const crossCompanyScope = { id: "scope-1", user_id: "user-a", scope_type: "PAYMENT_ACCOUNT", user_company_id: "company-a", account_company_id: "company-b" };
    const conflictingOrder = { sale_order_id: "order-conflict", company_ids: ["company-a", "company-b"], company_count: 2 };
    const unattributedOrder = { sale_order_id: "order-unattributed", client_id: "client-1", created_by: null };
    const query = jest.fn(async (sql: string): Promise<unknown[]> => {
        if (sql.includes("status NOT IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED')")) return [legacyVoid, unknownLifecycle];
        if (sql.includes("GROUP BY lower(btrim(operation_number))")) return [duplicateOperation];
        if (sql.includes("sp.status = 'PENDING_CONFIRMATION'") && sql.includes("pm.is_active = false")) return [pendingMissingMethod];
        if (sql.includes("cpa.usage NOT IN ('INFLOW', 'BOTH')")) return [pendingInvalidReceiver];
        if (sql.includes("pm.requires_operation_reference = true")) return [pendingMissingReference];
        if (sql.includes("sp.currency::text <> so.currency::text")) return [currencyMismatch];
        if (sql.includes("scope.scope_type = 'PAYMENT_ACCOUNT'")) return [crossCompanyScope];
        if (sql.includes("HAVING COUNT(DISTINCT evidence.company_id) > 1")) return [conflictingOrder];
        if (sql.includes("WHERE NOT EXISTS (")) return [unattributedOrder];
        return [];
    });
    const dataSource = { query };

    const checks = await collectFinancialAudit(dataSource);

    expect(checks.find((check) => check.check === "legacy_sale_payment_lifecycle_statuses"))
      .toMatchObject({ total: 2, details: [legacyVoid, unknownLifecycle] });
    expect(checks.find((check) => check.check === "duplicate_sale_payment_operation_references"))
      .toMatchObject({ total: 1, details: [duplicateOperation] });
    expect(checks.find((check) => check.check === "pending_sale_payments_without_valid_method"))
      .toMatchObject({ total: 1, details: [pendingMissingMethod] });
    expect(checks.find((check) => check.check === "pending_sale_payments_without_valid_receiver"))
      .toMatchObject({ total: 1, details: [pendingInvalidReceiver] });
    expect(checks.find((check) => check.check === "pending_sale_payments_missing_required_operation_reference"))
      .toMatchObject({ total: 1, details: [pendingMissingReference] });
    expect(checks.find((check) => check.check === "active_sale_payments_currency_mismatch"))
      .toMatchObject({ total: 1, details: [currencyMismatch] });
    expect(checks.find((check) => check.check === "financial_scope_users_without_company_or_cross_company_accounts"))
      .toMatchObject({ total: 1, details: [crossCompanyScope] });
    expect(checks.find((check) => check.check === "sale_orders_with_conflicting_company_evidence"))
      .toMatchObject({ total: 1, details: [conflictingOrder] });
    expect(checks.find((check) => check.check === "sale_orders_without_company_evidence"))
      .toMatchObject({ total: 1, details: [unattributedOrder] });
    expect(financialLifecyclePreflightQueries.map((query) => query.check)).toEqual([
      "legacy_sale_payment_lifecycle_statuses",
      "duplicate_sale_payment_operation_references",
      "pending_sale_payments_without_valid_method",
      "pending_sale_payments_without_valid_receiver",
      "pending_sale_payments_missing_required_operation_reference",
      "active_sale_payments_currency_mismatch",
    ]);
    expect(financialCompanyScopeAuditQueries.map((query) => query.check)).toEqual([
      "financial_scope_users_without_company_or_cross_company_accounts",
      "sale_orders_with_conflicting_company_evidence",
      "sale_orders_without_company_evidence",
    ]);
    expect(financialLedgerAuditQueries.map((query) => query.check)).toEqual([
      "sale_payment_movement_ledger_mismatch",
      "sale_order_payment_allocations_exceed_total",
    ]);
    expect(query).toHaveBeenCalledTimes(checks.length);
    expect(query.mock.calls.every(([sql]) => /^\s*(SELECT|WITH)\b/i.test(sql))).toBe(true);
  });
});
