import { ConflictException, ForbiddenException } from "@nestjs/common";
import { ManageIncomePaymentsUsecase } from "./manage-income-payments.usecase";

const creditRows = [
  { payment_id: "payment-1", sale_order_id: "source-1", available: "7.25" },
  { payment_id: "payment-2", sale_order_id: "source-2", available: "12.75" },
];

function createUsecase(options: { permissions?: string[]; balance?: string; remaining?: string; workflowReconciliation?: { reconcile: jest.Mock } } = {}) {
  const manager: any = {};
  manager.query = jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
    if (sql.includes("SELECT id FROM clients")) return [{ id: "client-1" }];
    if (sql.includes("AS applied_total")) return [{ id: "target-order", client_id: "client-1", total: "100.00", currency: "PEN", is_active: true, state_code: "OPEN", applied_total: options.remaining === undefined ? "25.00" : String(100 - Number(options.remaining)) }];
    if (sql.includes("AS balance")) return [{ balance: options.balance ?? "20.00" }];
    if (sql.includes("GROUP BY source.id")) {
      const allowedIds = params?.[2] as string[] | null | undefined;
      return allowedIds ? creditRows.filter((row) => allowedIds.includes(row.payment_id)) : creditRows;
    }
    if (sql.includes("SELECT request_hash, status, response_body")) return [];
    return [];
  });
  manager.transaction = jest.fn((callback: (tx: any) => unknown) => callback(manager));
  const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(options.permissions ?? ["customer_credits.apply", "customer_credits.view"]) };
  return { usecase: new ManageIncomePaymentsUsecase(manager, accessControl as any, options.workflowReconciliation as any), manager, accessControl };
}

const input = {
  clientId: "client-1",
  saleOrderId: "target-order",
  amount: 20,
  userId: "user-1",
  reason: "Aplicación autorizada",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  allowedIncomeIds: null,
};

describe("ManageIncomePaymentsUsecase customer credits", () => {
  it("returns available balances grouped by currency and checks the read permission", async () => {
    const { usecase, manager, accessControl } = createUsecase();
    manager.query.mockResolvedValueOnce([{ currency: "PEN", available: "20.00" }, { currency: "USD", available: "5.50" }]);

    await expect(usecase.getAvailableCustomerCredits("client-1", "user-1", null)).resolves.toEqual([
      { currency: "PEN", available: 20 }, { currency: "USD", available: 5.5 },
    ]);
    expect(accessControl.getEffectivePermissions).toHaveBeenCalledWith("user-1");
  });

  it("applies a credit across source payments with immutable negative ledger entries and positive order allocations", async () => {
    const { usecase, manager } = createUsecase();

    await expect(usecase.applyCustomerCredit(input)).resolves.toMatchObject({
      type: "success", saleOrderId: "target-order", clientId: "client-1", amount: 20, currency: "PEN",
    });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("'APPLY', $5"), ["client-1", "payment-1", "source-1", "target-order", -7.25, "PEN", "user-1", input.reason]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payment_allocations"), ["payment-1", "target-order", 7.25, "PEN", "user-1"]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("'APPLY', $5"), ["client-1", "payment-2", "source-2", "target-order", -12.75, "PEN", "user-1", input.reason]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("response_body = $2::jsonb"), expect.anything());
  });

  it("limits visible and spendable credit to source incomes allowed by the user's financial scope", async () => {
    const { usecase, manager } = createUsecase();
    const scopedInput = { ...input, amount: 7.25, allowedIncomeIds: ["payment-1"] };

    await expect(usecase.applyCustomerCredit(scopedInput)).resolves.toMatchObject({ type: "success", amount: 7.25 });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("source.id = ANY($3::uuid[])"), ["client-1", "PEN", ["payment-1"]]);
    expect(manager.query.mock.calls.filter(([sql]: [string]) => sql.includes("'APPLY', $5"))).toHaveLength(1);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("sale_payment_id = ANY($3::uuid[])"), ["client-1", "PEN", ["payment-1"]]);
  });

  it("reconciles paid status and workflow in the same database transaction as credit application", async () => {
    const workflowReconciliation = { reconcile: jest.fn().mockResolvedValue({ paymentStatus: "PAID" }) };
    const { usecase, manager } = createUsecase({ workflowReconciliation });

    await usecase.applyCustomerCredit(input);

    expect(workflowReconciliation.reconcile).toHaveBeenCalledWith(
      { saleOrderId: "target-order", executedBy: "user-1", source: "customer-credit-application" },
      expect.objectContaining({ manager }),
    );
  });

  it("rejects applying more than the available credit without writing ledger movements", async () => {
    const { usecase, manager } = createUsecase({ balance: "19.99" });

    await expect(usecase.applyCustomerCredit(input)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.query.mock.calls.some(([sql]: [string]) => sql.includes("movement_type, amount") && sql.includes("'APPLY'"))).toBe(false);
  });

  it("rejects applying more than the target order's remaining amount", async () => {
    const { usecase, manager } = createUsecase({ remaining: "10.00" });

    await expect(usecase.applyCustomerCredit(input)).rejects.toMatchObject({ response: { code: "CREDIT_EXCEEDS_ORDER_BALANCE" } });
    expect(manager.query.mock.calls.some(([sql]: [string]) => sql.includes("movement_type, amount") && sql.includes("'APPLY'"))).toBe(false);
  });

  it("requires a dedicated permission before either querying or changing credits", async () => {
    const { usecase, manager } = createUsecase({ permissions: ["customer_credits.view"] });

    await expect(usecase.applyCustomerCredit(input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.transaction).not.toHaveBeenCalled();
  });
});
