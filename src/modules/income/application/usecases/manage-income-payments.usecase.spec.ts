import { BadRequestException, ConflictException } from "@nestjs/common";
import { ManageIncomePaymentsUsecase } from "./manage-income-payments.usecase";

const systemAccessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["*"]) };

const payment = {
  id: "payment-1", sale_order_id: "order-a", amount: "25.00", currency: "PEN", status: "PENDING_CONFIRMATION",
  payment_date: "2026-10-02", date: "2026-10-02", method: "TRANSFERENCIA", operation_number: "OP-1",
  operation_code: "OP-1", note: null, company_payment_account_id: "account-1", payment_method_id: "method-1",
  version: 3, created_by_user_id: "creator-1", updated_by_user_id: null,
};

const orders = [
  { id: "order-a", client_id: "client-1", currency: "PEN", total: "100.00", is_active: false, state_code: "CANCELLED" },
  { id: "order-b", client_id: "client-1", currency: "PEN", total: "100.00", is_active: true, state_code: "OPEN" },
];

function buildUsecase(orderRows = orders, activeTotal = "10.00") {
  const manager: any = {};
  manager.query = jest.fn(async (sql: string) => {
    if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
    if (sql.includes("SELECT sp.*, sp.payment_date")) return [payment];
    if (sql.includes("SELECT so.id, so.client_id")) return orderRows;
    if (sql.includes("SELECT COALESCE(SUM(amount)")) return [{ amount: activeTotal }];
    if (sql.includes("AS available")) return [{ id: "order-b", number: "SO-2", client_name: "Cliente", total: "100.00", available: "90.00" }];
    return [];
  });
  manager.transaction = jest.fn((callback: (transactionManager: any) => unknown) => callback(manager));
  const usecase = new ManageIncomePaymentsUsecase(manager, systemAccessControl as any);
  return { usecase, manager };
}

const input = {
  incomeId: payment.id,
  targetSaleOrderId: "order-b",
  userId: "operator-1",
  expectedVersion: 3,
  reason: "El cliente confirmó el pedido correcto",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
};

describe("ManageIncomePaymentsUsecase.transferPending", () => {
  it("lists only compatible same-client/same-currency orders with enough remaining balance", async () => {
    const { usecase, manager } = buildUsecase();

    await expect(usecase.listTransferTargets(payment.id, "SO-2", null)).resolves.toEqual([{
      saleOrderId: "order-b", saleOrderNumber: "SO-2", clientName: "Cliente", total: 100, available: 90, currency: "PEN",
    }]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("so.client_id = (SELECT source.client_id"), [payment.sale_order_id, payment.currency, payment.sale_order_id, "SO-2", 25, null]);
  });

  it("moves a pending payment to an active order of the same client and currency", async () => {
    const { usecase, manager } = buildUsecase();

    await expect(usecase.transferPending(input)).resolves.toMatchObject({
      incomeId: payment.id,
      sourceSaleOrderId: "order-a",
      targetSaleOrderId: "order-b",
      version: 4,
      status: "PENDING_CONFIRMATION",
    });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET sale_order_id"), [payment.id, "order-b", "operator-1", 3]);
    expect(manager.query.mock.calls.filter(([sql]: [string]) => sql.includes("INSERT INTO sale_order_auditory"))).toHaveLength(2);
    expect(manager.query.mock.calls.filter(([sql]: [string]) => sql.includes("INSERT INTO financial_outbox_events"))).toHaveLength(2);
  });

  it("rejects transfers to a different client before changing the payment", async () => {
    const target = { ...orders[1], client_id: "other-client" };
    const { usecase, manager } = buildUsecase([orders[0], target]);

    await expect(usecase.transferPending(input)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET sale_order_id"), expect.anything());
  });

  it("rejects a transfer reason that is missing or too short", async () => {
    const { usecase, manager } = buildUsecase();

    await expect(usecase.transferPending({ ...input, reason: "no" })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it("rejects a target whose remaining total cannot cover the pending payment", async () => {
    const { usecase, manager } = buildUsecase(orders, "90.00");

    await expect(usecase.transferPending(input)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET sale_order_id"), expect.anything());
  });
});

describe("ManageIncomePaymentsUsecase.getBankReconciliationReport", () => {
  it("returns statement, reconciled and available totals separately per currency, including closed lines", async () => {
    const manager = { query: jest.fn().mockResolvedValue([
      { id: "line-1", currency: "PEN", amount: "100.00", reconciledAmount: "70.00", availableAmount: "30.00", activeAllocationCount: 2, status: undefined },
      { id: "line-2", currency: "PEN", amount: "20.00", reconciledAmount: "20.00", availableAmount: "0.00", activeAllocationCount: 1, status: undefined },
      { id: "line-3", currency: "USD", amount: "10.00", reconciledAmount: "0.00", availableAmount: "10.00", activeAllocationCount: 0, status: undefined },
    ]) };
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["*", "income.reconciliation.view"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, access as any);
    const report = await usecase.getBankReconciliationReport({ userId: "user-1", from: "2026-10-01", to: "2026-10-31" });
    expect(report.totalsByCurrency).toEqual({
      PEN: { statementAmount: 120, reconciledAmount: 90, availableAmount: 30, lineCount: 2 },
      USD: { statementAmount: 10, reconciledAmount: 0, availableAmount: 10, lineCount: 1 },
    });
    expect(report.items).toHaveLength(3);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("LEFT JOIN bank_reconciliation_allocations"), ["2026-10-01", "2026-10-31", null, null, null]);
  });

  it("rejects invalid, reversed, and overly wide date periods before querying", async () => {
    const manager = { query: jest.fn() };
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["*", "income.reconciliation.view"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, access as any);
    await expect(usecase.getBankReconciliationReport({ userId: "user-1", from: "2026-02-30", to: "2026-03-01" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.getBankReconciliationReport({ userId: "user-1", from: "2026-10-02", to: "2026-10-01" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.getBankReconciliationReport({ userId: "user-1", from: "2025-01-01", to: "2026-01-03" })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.query).not.toHaveBeenCalled();
  });
});

describe("ManageIncomePaymentsUsecase.prevalidate", () => {
  it("rejects a confirmation batch containing more than one payment date", async () => {
    const rows = [
      { ...payment, id: "payment-a", status: "CANCELLED", payment_date: "2026-10-02" },
      { ...payment, id: "payment-b", status: "REVERSED", payment_date: "2026-10-03" },
    ];
    const manager = { query: jest.fn(async (sql: string) => sql.includes("SELECT sp.*, sp.payment_date") ? rows : []) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, systemAccessControl as any);
    const result = await usecase.prevalidate(["payment-a", "payment-b"], "user-1");
    expect(result.paymentDate).toBeNull();
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "BATCH_DATE_MISMATCH" }));
    expect(result.canPost).toBe(false);
    expect(result.eligibleIds).toEqual([]);
  });
});

describe("ManageIncomePaymentsUsecase.getBatchResult", () => {
  const batchId = "44444444-4444-4444-8444-444444444444";
  const result = { type: "success", batchId, count: 2, totalsByCurrency: { PEN: 45 } };

  it("returns the persisted result only within the requesting user's posting scope", async () => {
    const manager = { query: jest.fn().mockResolvedValue([{ status: "COMPLETED", response_body: result }]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, systemAccessControl as any);

    await expect(usecase.getBatchResult(batchId, "user-1")).resolves.toEqual(result);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("scope_key = $2 OR scope_key LIKE $3"), [batchId, "post:user-1", "post:user-1:%"]);
  });

  it("does not disclose a batch that belongs to another user", async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, systemAccessControl as any);

    await expect(usecase.getBatchResult(batchId, "user-2")).rejects.toMatchObject({ status: 404 });
    expect(manager.query).toHaveBeenCalledWith(expect.any(String), [batchId, "post:user-2", "post:user-2:%"]);
  });

  it("rejects ambiguous keys and operations without a completed response", async () => {
    const manager = { query: jest.fn() };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, systemAccessControl as any);
    manager.query.mockResolvedValueOnce([
      { status: "COMPLETED", response_body: result },
      { status: "COMPLETED", response_body: result },
    ]);
    await expect(usecase.getBatchResult(batchId, "user-1")).rejects.toMatchObject({ response: expect.objectContaining({ code: "AMBIGUOUS_BATCH_ID" }) });
    manager.query.mockResolvedValueOnce([{ status: "IN_PROGRESS", response_body: null }]);
    await expect(usecase.getBatchResult(batchId, "user-1")).rejects.toMatchObject({ response: expect.objectContaining({ code: "BATCH_RESULT_NOT_READY" }) });
  });
});

describe("ManageIncomePaymentsUsecase.listCancellationTargets", () => {
  it("returns same-client, same-currency active orders and checks the posted-credit permission", async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ ...payment, status: "POSTED" }])
      .mockResolvedValueOnce([{ id: "order-b", number: "SO-2", client_name: "Cliente", total: "100.00", available: "75.00" }]) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["customer_credits.apply"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, accessControl as any);

    await expect(usecase.listCancellationTargets(payment.id, "user-1", " SO-2 ", null)).resolves.toEqual([{
      saleOrderId: "order-b", saleOrderNumber: "SO-2", clientName: "Cliente", total: 100, available: 75, currency: "PEN",
    }]);
    expect(manager.query).toHaveBeenNthCalledWith(2, expect.stringContaining("so.id <> source.id"), [payment.sale_order_id, payment.currency, "SO-2", null]);
    expect(accessControl.getEffectivePermissions).toHaveBeenCalledWith("user-1");
  });

  it("requires pending-transfer permission for pending incomes", async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([{ ...payment, status: "PENDING_CONFIRMATION" }]).mockResolvedValueOnce([]) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.transfer_pending"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, accessControl as any);

    await expect(usecase.listCancellationTargets(payment.id, "user-1", "", null)).resolves.toEqual([]);
    expect(manager.query).toHaveBeenCalledTimes(2);
  });
});

describe("ManageIncomePaymentsUsecase customer refunds", () => {
  const refund = {
    id: "refund-1", sale_payment_id: "payment-1", sale_order_id: "order-1", client_id: "client-1",
    amount: "12.50", currency: "PEN", status: "PENDING", reason: "Devolver importe duplicado", created_by_user_id: "creator-1",
  };
  const idempotencyKey = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  function setup(queryPermissions = ["customer_refunds.post"]) {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("SELECT company_id FROM users")) return [{ company_id: "company-1" }];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "operation-1" }];
      if (sql.includes("SELECT client_id FROM customer_refunds")) return [{ client_id: "client-1" }];
      if (sql.includes("SELECT id FROM clients")) return [{ id: "client-1" }];
      if (sql.includes("SELECT cr.*, sp.sale_order_id")) return [{ ...refund }];
      if (sql.includes("FROM company_payment_accounts")) return [{ company_payment_account_id: "out-account", currency: "PEN", usage: "OUTFLOW", is_active: true }];
      if (sql.includes("FROM financial_account_movements WHERE refund_id")) return [{ id: "refund-movement-1", company_payment_account_id: "out-account" }];
      return [];
    });
    manager.transaction = jest.fn((callback: (transactionManager: any) => unknown) => callback(manager));
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(queryPermissions) };
    return { manager, access, usecase: new ManageIncomePaymentsUsecase(manager, access as any) };
  }

  it("creates an idempotent pending refund only from available credit and reserves it", async () => {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "operation-1" }];
      if (sql.includes("SELECT so.client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("SELECT id FROM clients")) return [{ id: "client-1" }];
      if (sql.includes("SELECT * FROM sale_payments")) return [{ ...payment, status: "POSTED", sale_order_id: "order-1" }];
      if (sql.includes("FROM customer_credit_movements WHERE sale_payment_id")) return [{ available: "20.00" }];
      if (sql.includes("INSERT INTO customer_refunds")) return [{ id: "refund-1" }];
      return [];
    });
    manager.transaction = jest.fn((callback: (transactionManager: any) => unknown) => callback(manager));
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["customer_refunds.create"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, access as any);

    await expect(usecase.createRefund({ incomeId: "payment-1", userId: "operator-1", amount: 12.5, reason: "Devolución parcial acordada", idempotencyKey }))
      .resolves.toMatchObject({ refundId: "refund-1", status: "PENDING", amount: 12.5, currency: "PEN" });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO customer_credit_movements"), ["client-1", "payment-1", "order-1", -12.5, "PEN", "operator-1", "Devolución parcial acordada"]);
  });

  it("lists refunds together with the remaining source-payment credit", async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: "refund-1", amount: "12.50", currency: "PEN", status: "PENDING" }])
      .mockResolvedValueOnce([{ available: "7.50" }]) };
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["customer_refunds.view"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, access as any);

    await expect(usecase.listRefunds("payment-1", "reader-1")).resolves.toEqual({
      items: [{ id: "refund-1", amount: 12.5, currency: "PEN", status: "PENDING" }], availableCredit: 7.5,
    });
  });

  it("confirms a refund as a separate negative account movement and is idempotent", async () => {
    const { manager, usecase } = setup();
    await expect(usecase.postRefund({ refundId: refund.id, userId: "approver-1", companyPaymentAccountId: "out-account", operationNumber: "REF-9", idempotencyKey }))
      .resolves.toMatchObject({ refundId: refund.id, status: "POSTED", amount: 12.5, currency: "PEN" });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE customer_refunds SET company_payment_account_id"), [refund.id, "out-account", "REF-9", "approver-1"]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("'REFUND'"), ["out-account", refund.id, -12.5, "PEN", "approver-1", refund.reason]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_order_auditory"), expect.arrayContaining(["customer_refund_posted"]));
  });

  it("prevents self-approval unless the explicit exception permission is granted", async () => {
    const { manager, usecase } = setup(["customer_refunds.post"]);
    await expect(usecase.postRefund({ refundId: refund.id, userId: "creator-1", companyPaymentAccountId: "out-account", operationNumber: "REF-9", idempotencyKey }))
      .rejects.toMatchObject({ response: expect.objectContaining({ code: "REFUND_SELF_APPROVAL_FORBIDDEN" }) });
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE customer_refunds SET company_payment_account_id"), expect.anything());
  });

  it("cancels a pending refund by releasing its reserved customer credit", async () => {
    const { manager, usecase } = setup(["customer_refunds.cancel"]);
    await expect(usecase.cancelRefund({ refundId: refund.id, userId: "operator-1", reason: "El cliente ya no requiere devolución", idempotencyKey }))
      .resolves.toMatchObject({ refundId: refund.id, status: "CANCELLED" });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'CANCELLED'"), [refund.id]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("'REFUND'"), ["client-1", "payment-1", "order-1", 12.5, "PEN", "operator-1", expect.stringContaining("El cliente ya no requiere devolución")]);
  });

  it("reverses a posted refund with compensating account and customer-credit movements", async () => {
    const { manager, usecase } = setup(["customer_refunds.reverse"]);
    const postedRefund = { ...refund, status: "POSTED" };
    manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "operation-1" }];
      if (sql.includes("SELECT client_id FROM customer_refunds")) return [{ client_id: "client-1" }];
      if (sql.includes("SELECT id FROM clients")) return [{ id: "client-1" }];
      if (sql.includes("SELECT cr.*, sp.sale_order_id")) return [postedRefund];
      if (sql.includes("FROM financial_account_movements WHERE refund_id")) return [{ id: "refund-movement-1", company_payment_account_id: "out-account" }];
      return [];
    });
    await expect(usecase.reverseRefund({ refundId: refund.id, userId: "approver-1", reason: "Devolución contabilizada por error", idempotencyKey }))
      .resolves.toMatchObject({ refundId: refund.id, status: "REVERSED" });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("'REFUND_REVERSAL'"), ["out-account", refund.id, "refund-movement-1", 12.5, "PEN", "approver-1", "Devolución contabilizada por error"]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'REVERSED'"), [refund.id, "approver-1"]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("'REFUND'"), ["client-1", "payment-1", "order-1", 12.5, "PEN", "approver-1", expect.stringContaining("Devolución contabilizada por error")]);
  });
});

describe("ManageIncomePaymentsUsecase bank reconciliation", () => {
  const key = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  function createManager() {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("SELECT company_id FROM users")) return [{ company_id: "company-1" }];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idem-1" }];
      if (sql.includes("FROM company_payment_accounts")) return [{ currency: "PEN", usage: "BOTH", is_active: true }];
      if (sql.includes("INSERT INTO bank_statement_lines")) return [{ id: "line-1", bankReference: "BANK-1" }];
      if (sql.includes("FROM bank_statement_lines l")) return [{ id: "line-1", company_payment_account_id: "account-1", currency: "PEN", amount: "50.00", bank_reference: "BANK-1" }];
      if (sql.includes("SELECT sp.*, sp.payment_date")) return [{ ...payment, status: "POSTED", amount: "25.00", currency: "PEN", sale_order_id: "order-1" }];
      if (sql.includes("SELECT COALESCE(SUM(amount),0)::text AS allocated")) return [{ allocated: "0.00" }];
      if (sql.includes("SELECT COALESCE(SUM(amount),0)::text AS amount")) return [{ amount: "0.00" }];
      if (sql.includes("INSERT INTO bank_reconciliation_allocations")) return [{ id: "allocation-1", amount: "20.00" }];
      if (sql.includes("SELECT id, amount::text AS amount, bank_statement_line_id, unreconciled_at")) return [{ id: "allocation-1", amount: "20.00", bank_statement_line_id: "line-1", unreconciled_at: null }];
      return [];
    });
    manager.transaction = jest.fn((callback: (transactionManager: any) => unknown) => callback(manager));
    return manager;
  }

  it("records a bank statement line only for an active compatible account", async () => {
    const manager = createManager();
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["income.reconciliation.reconcile"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, access as any);
    await expect(usecase.createBankStatementLine({
      userId: "user-1", companyPaymentAccountId: "account-1", bankReference: " BANK-1 ", operationDate: "2026-10-12", amount: 50, currency: "PEN", idempotencyKey: key,
    })).resolves.toMatchObject({ line: { id: "line-1" } });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO bank_statement_lines"), ["account-1", "BANK-1", "2026-10-12", 50, "PEN", "user-1"]);
  });

  it("rejects malformed monetary values as client errors before opening a transaction", async () => {
    const manager = createManager();
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["income.reconciliation.reconcile"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, access as any);
    await expect(usecase.reconcileIncome({ incomeId: "payment-1", userId: "user-1", bankStatementLineId: "line-1", amount: Number.NaN, idempotencyKey: key }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it("allocates without exceeding either the bank-line or posted-income balance", async () => {
    const manager = createManager();
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["income.reconciliation.reconcile"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, access as any);
    await expect(usecase.reconcileIncome({ incomeId: "payment-1", userId: "user-1", bankStatementLineId: "line-1", amount: 20, idempotencyKey: key }))
      .resolves.toMatchObject({ allocationId: "allocation-1", amount: 20 });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO bank_reconciliation_allocations"), ["line-1", "payment-1", 20, "user-1"]);
  });

  it("lists only statement lines with a remaining balance for the selected receiver account", async () => {
    const manager = { query: jest.fn().mockResolvedValue([{ id: "line-1", available: "30.00" }]) };
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["*", "income.reconciliation.view"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager as any, access as any);
    await expect(usecase.listAvailableBankStatementLines("user-1", "account-1")).resolves.toEqual([{ id: "line-1", available: "30.00" }]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("HAVING l.amount - COALESCE"), ["account-1", null, null]);
  });

  it("rejects allocation above the income amount", async () => {
    const manager = createManager();
    manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT company_id FROM users")) return [{ company_id: "company-1" }];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idem-1" }];
      if (sql.includes("FROM bank_statement_lines l")) return [{ id: "line-1", company_payment_account_id: "account-1", currency: "PEN", amount: "50.00", bank_reference: "BANK-1" }];
      if (sql.includes("SELECT sp.*, sp.payment_date")) return [{ ...payment, status: "POSTED", amount: "25.00", currency: "PEN", sale_order_id: "order-1" }];
      if (sql.includes("SELECT COALESCE(SUM(amount),0)::text AS allocated")) return [{ allocated: "0.00" }];
      return [];
    });
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["income.reconciliation.reconcile"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, access as any);
    await expect(usecase.reconcileIncome({ incomeId: "payment-1", userId: "user-1", bankStatementLineId: "line-1", amount: 30, idempotencyKey: key }))
      .rejects.toMatchObject({ response: expect.objectContaining({ code: "INCOME_RECONCILED_AMOUNT_EXCEEDED" }) });
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO bank_reconciliation_allocations"), expect.anything());
  });

  it("requires a reason and records desconciliation as an audited soft transition", async () => {
    const manager = createManager();
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(["income.reconciliation.unreconcile"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, access as any);
    await expect(usecase.unreconcileIncome({ incomeId: "payment-1", allocationId: "allocation-1", userId: "user-1", reason: "Incorrecta referencia", idempotencyKey: key }))
      .resolves.toMatchObject({ reconciliationStatus: "UNRECONCILED" });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("unreconciled_at = now()"), ["allocation-1", "user-1", "Incorrecta referencia"]);
  });
});

describe("ManageIncomePaymentsUsecase.postBatch idempotency scope", () => {
  it("uses a compact user scope so normal batch sizes fit the persisted scope column", async () => {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("SELECT sp.*, sp.payment_date")) return [];
      return [];
    });
    manager.transaction = jest.fn((callback: (tx: any) => unknown) => callback(manager));
    const usecase = new ManageIncomePaymentsUsecase(manager, systemAccessControl as any);
    const ids = Array.from({ length: 25 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);

    await expect(usecase.postBatch({
      incomeIds: ids,
      userId: "user-1",
      expectedVersions: ids.map((id) => ({ id, version: 1 })),
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
    })).rejects.toMatchObject({ status: 404 });

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO financial_idempotency_records"),
      expect.arrayContaining(["post:user-1", "55555555-5555-4555-8555-555555555555"]),
    );
    expect("post:user-1".length).toBeLessThanOrEqual(220);
  });
});

const postedPayment = { ...payment, status: "POSTED", version: 4 };

describe("ManageIncomePaymentsUsecase.reenter", () => {
  const closedSource = { ...payment, status: "CANCELLED", payment_method_id: "method-old" };
  const request = {
    incomeId: closedSource.id, userId: "finance-operator", reason: "Se recibió confirmación del cliente",
    idempotencyKey: "33333333-3333-4333-8333-333333333333", amount: 30, date: "2026-10-12",
    paymentMethodId: "method-1", companyPaymentAccountId: "account-2", operationNumber: "OP-NEW", note: "Pago revisado",
  };
  const build = () => {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("SELECT sp.*")) return [closedSource];
      if (sql.includes("SELECT so.currency")) return [{ currency: "PEN", is_active: true, state_code: "OPEN" }];
      if (sql.includes("FROM payment_methods pm")) return [{ is_active: true, code: "BANK_TRANSFER", name: "Transferencia", requires_operation_number: true }];
      if (sql.includes("FROM company_payment_accounts")) return [{ currency: "PEN", usage: "INFLOW", is_active: true, type: "BANK_ACCOUNT" }];
      if (sql.includes("INSERT INTO sale_payments")) return [{ id: "new-payment", version: 1, status: "PENDING_CONFIRMATION" }];
      return [];
    });
    manager.transaction = jest.fn((callback: (tx: any) => unknown) => callback(manager));
    return { manager, usecase: new ManageIncomePaymentsUsecase(manager, systemAccessControl as any) };
  };

  it("creates an independent pending payment from the values reviewed by the user", async () => {
    const { usecase, manager } = build();
    await expect(usecase.reenter(request)).resolves.toMatchObject({ incomeId: "new-payment", sourceIncomeId: closedSource.id, status: "PENDING_CONFIRMATION" });
    const insert = manager.query.mock.calls.find(([sql]: [string]) => sql.includes("INSERT INTO sale_payments"));
    expect(insert[1]).toEqual([closedSource.sale_order_id, "2026-10-12T00:00:00-05:00", "2026-10-12", "Transferencia", "OP-NEW", 30, "Pago revisado", "account-2", "method-1", "PEN", "finance-operator", closedSource.id, request.reason]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("reentered_from_payment_id"), expect.anything());
  });

  it("requires a new operation number when the selected method needs one", async () => {
    const { usecase, manager } = build();
    await expect(usecase.reenter({ ...request, operationNumber: null })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payments"), expect.anything());
  });

  it("does not allow re-entry into a cancelled order", async () => {
    const { manager, usecase } = build();
    manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("SELECT sp.*")) return [closedSource];
      if (sql.includes("SELECT so.currency")) return [{ currency: "PEN", is_active: true, state_code: "CANCELLED" }];
      return [];
    });
    await expect(usecase.reenter(request)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payments"), expect.anything());
  });
});

const correctionInput = {
  incomeId: postedPayment.id,
  userId: "finance-operator",
  expectedVersion: 4,
  amount: 30,
  date: "2026-10-12",
  paymentMethodId: "method-1",
  companyPaymentAccountId: "account-2",
  operationNumber: "OP-1",
  note: "Dato corregido",
  reason: "Corrección autorizada por Finanzas",
  idempotencyKey: "22222222-2222-4222-8222-222222222222",
};

function buildCorrectionUsecase(overrides: Record<string, any> = {}) {
  const manager: any = {};
  manager.query = jest.fn(async (sql: string) => {
    if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
    if (sql.includes("SELECT sp.*, sp.payment_date")) return [postedPayment];
    if (sql.includes("SELECT so.id, so.client_id, so.total")) return [{ id: "order-a", client_id: "client-1", total: "100.00", currency: "PEN", is_active: true, state_code: "OPEN" }];
    if (sql.includes("AS has_credit_movements")) return [{ reconciled: false, has_refunds: false, has_credit_movements: false, ...overrides.dependencies }];
    if (sql.includes("FROM financial_account_movements WHERE sale_payment_id")) return [{ id: "movement-1", company_payment_account_id: "account-1", amount: "25.00" }];
    if (sql.includes("FROM company_payment_accounts")) return [{ currency: "PEN", usage: "INFLOW", is_active: true, type: "BANK_ACCOUNT" }];
    if (sql.includes("FROM payment_methods pm")) return [{ is_active: true, code: "BANK_TRANSFER", name: "Transferencia bancaria", requires_operation_number: true }];
    if (sql.includes("AS active_total")) return [{ active_total: overrides.activeTotal ?? "10.00" }];
    if (sql.includes("INSERT INTO sale_payments")) return [{ id: "corrected-payment-1", version: 1, status: "POSTED" }];
    return [];
  });
  manager.transaction = jest.fn((callback: (transactionManager: any) => unknown) => callback(manager));
  return { usecase: new ManageIncomePaymentsUsecase(manager, systemAccessControl as any), manager };
}

describe("ManageIncomePaymentsUsecase.correctPosted", () => {
  it("reverses the original and posts a linked corrected payment with immutable ledger entries", async () => {
    const { usecase, manager } = buildCorrectionUsecase();

    await expect(usecase.correctPosted(correctionInput)).resolves.toMatchObject({
      sourceIncomeId: postedPayment.id,
      incomeId: "corrected-payment-1",
      sourceStatus: "REVERSED",
      status: "POSTED",
      amount: 30,
      currency: "PEN",
    });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("movement_type, amount, currency"), expect.arrayContaining(["account-1", postedPayment.id, "movement-1", -25]));
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("corrected_from_payment_id"), expect.arrayContaining([postedPayment.id]));
    expect(manager.query.mock.calls.filter(([sql]: [string]) => sql.includes("INSERT INTO sale_order_auditory"))).toHaveLength(2);
    expect(manager.query.mock.calls.filter(([sql]: [string]) => sql.includes("INSERT INTO financial_outbox_events"))).toHaveLength(2);
  });

  it("blocks correction until reconciliation, credit, and refund dependencies are resolved", async () => {
    const { usecase, manager } = buildCorrectionUsecase({ dependencies: { has_credit_movements: true } });

    await expect(usecase.correctPosted(correctionInput)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payments"), expect.anything());
  });

  it("requires explicit confirmation when corrected amount exceeds the available order balance", async () => {
    const { usecase, manager } = buildCorrectionUsecase({ activeTotal: "90.00" });

    await expect(usecase.correctPosted(correctionInput)).rejects.toMatchObject({
      response: expect.objectContaining({ code: "OVERPAYMENT_CONFIRMATION_REQUIRED" }),
    });
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET status = 'REVERSED'"), expect.anything());
  });

  it("validates the reason before opening a transaction", async () => {
    const { usecase, manager } = buildCorrectionUsecase();

    await expect(usecase.correctPosted({ ...correctionInput, reason: "no" })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.transaction).not.toHaveBeenCalled();
  });
});

describe("ManageIncomePaymentsUsecase.applyCustomerCredit", () => {
  it("allocates credit and reconciles the order workflow in the same transaction", async () => {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("SELECT id FROM clients")) return [{ id: "client-1" }];
      if (sql.includes("AS applied_total")) return [{
        id: "order-b", client_id: "client-1", total: "100.00", currency: "PEN", is_active: true,
        state_code: "OPEN", applied_total: "40.00",
      }];
      if (sql.includes("AS balance")) return [{ balance: "20.00" }];
      if (sql.includes("AS available")) return [{ payment_id: "payment-credit", sale_order_id: "order-a", available: "20.00" }];
      return [];
    });
    manager.transaction = jest.fn((callback: (tx: any) => unknown) => callback(manager));
    const workflow = { reconcile: jest.fn().mockResolvedValue({ paymentStatus: "PAID" }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["customer_credits.apply"]) };
    const usecase = new ManageIncomePaymentsUsecase(manager, accessControl as any, workflow as any);

    await expect(usecase.applyCustomerCredit({
      clientId: "client-1", saleOrderId: "order-b", amount: 20, userId: "operator-1",
      reason: "Aplicar saldo", idempotencyKey: "66666666-6666-4666-8666-666666666666", allowedIncomeIds: null,
    })).resolves.toMatchObject({ type: "success", saleOrderId: "order-b", amount: 20, currency: "PEN" });

    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payment_allocations"), [
      "payment-credit", "order-b", 20, "PEN", "operator-1",
    ]);
    expect(workflow.reconcile).toHaveBeenCalledWith(
      { saleOrderId: "order-b", executedBy: "operator-1", source: "customer-credit-application" },
      expect.objectContaining({ manager }),
    );
    expect(manager.query.mock.calls.findIndex(([sql]: [string]) => sql.includes("INSERT INTO sale_payment_allocations")))
      .toBeLessThan(manager.query.mock.calls.findIndex(([sql]: [string]) => sql.includes("INSERT INTO sale_order_auditory")));
  });
});

describe("ManageIncomePaymentsUsecase.updatePending idempotency", () => {
  it("does not increment version or audit a request that changes no payment fields", async () => {
    const manager: any = {};
    manager.query = jest.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "operation-1" }];
      if (sql.includes("SELECT sp.*, sp.payment_date")) return [payment];
      if (sql.includes("SELECT currency, total, is_active FROM sale_orders")) return [{ currency: "PEN", total: "100.00", is_active: true }];
      if (sql.includes("SELECT currency, usage, is_active, type FROM company_payment_accounts")) return [{ currency: "PEN", usage: "INFLOW", is_active: true, type: "BANK_ACCOUNT" }];
      if (sql.includes("FROM payment_methods pm")) return [{ is_active: true, code: "BANK_TRANSFER", requires_operation_number: false }];
      if (sql.includes("SELECT COALESCE(SUM(amount), 0)")) return [{ amount: "10.00" }];
      return [];
    });
    manager.transaction = jest.fn((callback: (tx: any) => unknown) => callback(manager));
    const usecase = new ManageIncomePaymentsUsecase(manager, systemAccessControl as any);

    await expect(usecase.updatePending({
      incomeId: payment.id, userId: "operator-1", idempotencyKey: "99999999-9999-4999-8999-999999999999",
      version: payment.version, amount: 25, date: "2026-10-02", paymentMethodId: payment.payment_method_id,
      companyPaymentAccountId: payment.company_payment_account_id!, operationNumber: payment.operation_number, note: null,
    })).resolves.toMatchObject({ type: "success", version: payment.version, status: "PENDING_CONFIRMATION" });

    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET amount"), expect.anything());
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_order_auditory"), expect.anything());
    expect(manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO financial_outbox_events"), expect.anything());
  });

  it("replays one completed edit and rejects reuse of its key with changed data", async () => {
    const paymentRow = { ...payment, sale_order_id: "order-a", amount: "2.00", currency: "PEN", version: 1 };
    let idempotency: { request_hash: string; status: string; response_body?: unknown } | null = null;
    const calls: string[] = [];
    const manager: any = {};
    manager.query = jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push(sql);
      if (sql.includes("INSERT INTO financial_idempotency_records")) {
        if (idempotency) return [];
        idempotency = { request_hash: String(params[2]), status: "IN_PROGRESS" };
        return [{ id: "operation-1" }];
      }
      if (sql.includes("SELECT request_hash, status, response_body")) return idempotency ? [idempotency] : [];
      if (sql.includes("UPDATE financial_idempotency_records")) {
        idempotency = { request_hash: idempotency!.request_hash, status: "COMPLETED", response_body: JSON.parse(String(params[1])) };
        return [];
      }
      if (sql.includes("SELECT sp.*, sp.payment_date")) return [paymentRow];
      if (sql.includes("SELECT currency, total, is_active FROM sale_orders")) return [{ currency: "PEN", total: "100.00", is_active: true }];
      if (sql.includes("SELECT currency, usage, is_active, type FROM company_payment_accounts")) return [{ currency: "PEN", usage: "INFLOW", is_active: true, type: "BANK_ACCOUNT" }];
      if (sql.includes("FROM payment_methods pm")) return [{ is_active: true, code: "BANK_TRANSFER", requires_operation_number: false }];
      if (sql.includes("SELECT COALESCE(SUM(amount), 0)")) return [{ amount: "10.00" }];
      return [];
    });
    manager.transaction = jest.fn((callback: (tx: any) => unknown) => callback(manager));
    const usecase = new ManageIncomePaymentsUsecase(manager, systemAccessControl as any);
    const input = {
      incomeId: paymentRow.id, userId: "operator-1", idempotencyKey: "88888888-8888-4888-8888-888888888888",
      version: 1, amount: 25.5, date: "2026-10-02", paymentMethodId: "method-1", companyPaymentAccountId: "account-1",
      operationNumber: " OP-NEW ", note: " Updated ",
    };

    const first = await usecase.updatePending(input);
    const replay = await usecase.updatePending(input);
    await expect(usecase.updatePending({ ...input, note: "Different content" })).rejects.toMatchObject({ status: 409 });

    expect(first).toEqual({ type: "success", incomeId: paymentRow.id, version: 2, status: "PENDING_CONFIRMATION" });
    expect(replay).toEqual(first);
    expect(calls.filter((sql) => sql.includes("UPDATE sale_payments SET amount"))).toHaveLength(1);
    expect(calls.filter((sql) => sql.includes("INSERT INTO sale_order_auditory"))).toHaveLength(1);
    expect(calls.filter((sql) => sql.includes("INSERT INTO financial_outbox_events"))).toHaveLength(1);
  });
});
