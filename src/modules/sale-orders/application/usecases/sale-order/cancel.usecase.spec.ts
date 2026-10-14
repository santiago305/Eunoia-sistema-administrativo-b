import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { createHash } from "crypto";
import { CancelSaleOrderUsecase } from "./cancel.usecase";

describe("CancelSaleOrderUsecase", () => {
  it.each([
    [0, ClientType.LAGGING],
    [1, ClientType.NEW],
    [2, ClientType.REPURCHASE],
  ])("classifies %s completed orders as %s after cancellation", async (count, expectedType) => {
    const tx = { manager: { query: jest.fn(async (sql: string) => sql.includes("SELECT client_id") ? [{ client_id: "client-1" }] : []) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "order-1",
        clientId: "client-1",
        createdBy: "user-1",
      }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(count),
    };
    const clientRepo = { update: jest.fn() };
    const transitionService = {
      advance: jest.fn().mockResolvedValue({
        order: { id: "order-1", currentStateId: "cancelled" },
        warnings: [],
        actionOutcomes: [],
      }),
    };
    const usecase = new CancelSaleOrderUsecase(
      { runInTransaction: (work: any) => work(tx) } as any,
      saleOrderRepo as any,
      clientRepo as any,
      transitionService as any,
      { listBySaleOrderId: jest.fn().mockResolvedValue([]) } as any,
    );

    await expect(usecase.execute({ saleOrderId: "order-1" })).resolves.toEqual({
      saleOrderId: "order-1",
      currentStateId: "cancelled",
    });
    expect(transitionService.advance).toHaveBeenCalledWith(
      expect.objectContaining({ saleOrderId: "order-1", transitionPurpose: "CANCEL" }),
      tx,
    );
    expect(clientRepo.update).toHaveBeenCalledWith(
      { clientId: "client-1", type: expectedType },
      tx,
    );
  });

  it("requires an explicit resolution for every pending or posted income", async () => {
    const tx = { manager: { query: jest.fn(async (sql: string) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return [{ id: "payment-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "POSTED", version: 1 }];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      return [];
    }) } };
    const saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }) };
    const transitionService = { advance: jest.fn() };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order"]) };
    const usecase = new CancelSaleOrderUsecase({ runInTransaction: (work: any) => work(tx) } as any, saleOrderRepo as any, {} as any, transitionService as any, {} as any, accessControl as any);
    await expect(usecase.execute({ saleOrderId: "order-1", userId: "user-1", idempotencyKey: "66666666-6666-4666-8666-666666666666" })).rejects.toMatchObject({
      response: expect.objectContaining({ code: "PAYMENT_RESOLUTION_SET_MISMATCH" }),
    });
    expect(transitionService.advance).not.toHaveBeenCalled();
  });

  it("cancels pending incomes with an audit and resolves cancellation idempotently", async () => {
    const payment = { id: "payment-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "PENDING_CONFIRMATION", version: 1 };
    let paymentActive = true;
    let persistedResult: any;
    const tx = { manager: { query: jest.fn(async (sql: string) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return paymentActive ? [payment] : [];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("SELECT request_hash, status, response_body")) return persistedResult ? [{ request_hash: persistedResult.requestHash, status: "COMPLETED", response_body: persistedResult.response }] : [];
      if (sql.includes("UPDATE sale_payments SET status = 'CANCELLED'")) { paymentActive = false; return []; }
      if (sql.includes("UPDATE financial_idempotency_records SET status = 'COMPLETED'")) {
        persistedResult = { ...persistedResult, response: { saleOrderId: "order-1", currentStateId: "cancelled" } };
        return [];
      }
      return [];
    }) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const clientRepo = { update: jest.fn() };
    const transitionService = { advance: jest.fn().mockResolvedValue({ order: { currentStateId: "cancelled" } }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order"]) };
    const usecase = new CancelSaleOrderUsecase({ runInTransaction: (work: any) => work(tx) } as any, saleOrderRepo as any, clientRepo as any, transitionService as any, {} as any, accessControl as any);

    const request: Parameters<typeof usecase.execute>[0] = {
      saleOrderId: "order-1", userId: "user-1", idempotencyKey: "66666666-6666-4666-8666-666666666666",
      resolutions: [{ incomeId: "payment-1", action: "CANCEL_PENDING", reason: "Pedido cancelado" }],
    };
    persistedResult = { requestHash: createHash("sha256").update(JSON.stringify({ saleOrderId: "order-1", resolutions: request.resolutions })).digest("hex"), response: { saleOrderId: "order-1", currentStateId: "cancelled" } };
    await expect(usecase.execute(request)).resolves.toEqual({ saleOrderId: "order-1", currentStateId: "cancelled" });
    await expect(usecase.execute(request)).resolves.toEqual({ saleOrderId: "order-1", currentStateId: "cancelled" });
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("status = 'CANCELLED'"), ["payment-1", "user-1", "Pedido cancelado"]);
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO financial_outbox_events"), expect.any(Array));
    expect(transitionService.advance).toHaveBeenCalledWith(expect.objectContaining({ financialCancellationResolved: true }), tx);
    expect(transitionService.advance).toHaveBeenCalledTimes(1);
  });

  it("replays a completed cancellation before comparing the changed active payment set", async () => {
    const posted = { id: "posted-1", sale_order_id: "order-1", amount: "45.67", currency: "PEN", status: "POSTED", version: 2 };
    const pending = { id: "pending-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "PENDING_CONFIRMATION", version: 1 };
    let activePayments = [posted, pending];
    let requestHash: string | null = null;
    let result: unknown;
    let inserts = 0;
    const tx = { manager: { query: jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return activePayments;
      if (sql.includes("INSERT INTO financial_idempotency_records")) {
        inserts += 1;
        if (inserts === 1) {
          requestHash = String(params?.[2]);
          return [{ id: "idempotency-1" }];
        }
        return [];
      }
      if (sql.includes("SELECT request_hash, status, response_body")) {
        return requestHash ? [{ request_hash: requestHash, status: "COMPLETED", response_body: result }] : [];
      }
      if (sql.includes("UPDATE sale_payments SET status = 'CANCELLED'")) {
        activePayments = [posted];
        return [];
      }
      if (sql.includes("UPDATE financial_idempotency_records SET status = 'COMPLETED'")) {
        result = { saleOrderId: "order-1", currentStateId: "cancelled" };
        return [];
      }
      return [];
    }) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const transitionService = { advance: jest.fn().mockResolvedValue({ order: { currentStateId: "cancelled" } }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order"]) };
    const usecase = new CancelSaleOrderUsecase(
      { runInTransaction: (work: any) => work(tx) } as any,
      saleOrderRepo as any,
      { update: jest.fn() } as any,
      transitionService as any,
      {} as any,
      accessControl as any,
    );
    const request: Parameters<typeof usecase.execute>[0] = {
      saleOrderId: "order-1",
      userId: "user-1",
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
      resolutions: [
        { incomeId: "posted-1", action: "KEEP_AS_CREDIT", reason: "Conservar como saldo" },
        { incomeId: "pending-1", action: "CANCEL_PENDING", reason: "Cancelar pendiente" },
      ],
    };

    await expect(usecase.execute(request)).resolves.toEqual({ saleOrderId: "order-1", currentStateId: "cancelled" });
    await expect(usecase.execute(request)).resolves.toEqual({ saleOrderId: "order-1", currentStateId: "cancelled" });
    expect(activePayments).toEqual([posted]);
    expect(transitionService.advance).toHaveBeenCalledTimes(1);
    expect(tx.manager.query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT request_hash, status, response_body"),
      ["cancel-order:user-1:order-1", request.idempotencyKey],
    );
  });

  it("releases a posted payment to customer credit without reversing the bank income", async () => {
    const payment = { id: "payment-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "POSTED", version: 2 };
    const tx = { manager: { query: jest.fn(async (sql: string) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return [payment];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("FROM sale_payment_allocations")) return [{ amount: "20.00" }];
      if (sql.includes("FROM customer_credit_movements")) return [{ amount: "0.00" }];
      return [];
    }) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const transitionService = { advance: jest.fn().mockResolvedValue({ order: { currentStateId: "cancelled" } }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order"]) };
    const usecase = new CancelSaleOrderUsecase({ runInTransaction: (work: any) => work(tx) } as any, saleOrderRepo as any, { update: jest.fn() } as any, transitionService as any, {} as any, accessControl as any);

    await usecase.execute({
      saleOrderId: "order-1", userId: "user-1", idempotencyKey: "77777777-7777-4777-8777-777777777777",
      resolutions: [{ incomeId: "payment-1", action: "KEEP_AS_CREDIT", reason: "Cliente usará luego" }],
    });

    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payment_allocations"), ["payment-1", "order-1", -20, "PEN", "user-1"]);
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("'RELEASE'"), ["client-1", "payment-1", "order-1", 20, "PEN", "user-1", "Cliente usará luego"]);
    expect(tx.manager.query).not.toHaveBeenCalledWith(expect.stringContaining("movement_type = 'REVERSAL'"), expect.anything());
    expect(transitionService.advance).toHaveBeenCalledWith(expect.objectContaining({ financialCancellationResolved: true }), tx);
  });

  it("creates a pending refund and reserves its value without changing the posted income", async () => {
    const payment = { id: "payment-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "POSTED", version: 2 };
    const tx = { manager: { query: jest.fn(async (sql: string) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return [payment];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("FROM sale_payment_allocations")) return [{ amount: "20.00" }];
      if (sql.includes("FROM customer_credit_movements")) return [{ amount: "0.00" }];
      if (sql.includes("INSERT INTO customer_refunds")) return [{ id: "refund-1" }];
      return [];
    }) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const transitionService = { advance: jest.fn().mockResolvedValue({ order: { currentStateId: "cancelled" } }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "customer_refunds.create"]) };
    const usecase = new CancelSaleOrderUsecase({ runInTransaction: (work: any) => work(tx) } as any, saleOrderRepo as any, { update: jest.fn() } as any, transitionService as any, {} as any, accessControl as any);

    await usecase.execute({
      saleOrderId: "order-1", userId: "user-1", idempotencyKey: "88888888-8888-4888-8888-888888888888",
      resolutions: [{ incomeId: "payment-1", action: "REFUND", amount: 20, reason: "Devolver pago recibido" }],
    });

    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("'PENDING'"), ["payment-1", "client-1", 20, "PEN", "Devolver pago recibido", "user-1"]);
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("'REFUND'"), ["client-1", "payment-1", "order-1", -20, "PEN", "user-1", "Devolver pago recibido"]);
    expect(tx.manager.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET status"), expect.anything());
  });

  it("transfers a pending income only to an active same-client and same-currency order", async () => {
    const payment = { id: "payment-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "PENDING_CONFIRMATION", version: 2 };
    const tx = { manager: { query: jest.fn(async (sql: string) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return [payment];
      if (sql.includes("SELECT so.id, so.client_id")) return [{ id: "order-2", client_id: "client-1", currency: "PEN", total: "100.00", is_active: true, state_code: "OPEN" }];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("AS reserved")) return [{ reserved: "10.00" }];
      return [];
    }) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const transitionService = { advance: jest.fn().mockResolvedValue({ order: { currentStateId: "cancelled" } }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "sale_orders.payments.transfer_pending"]) };
    const usecase = new CancelSaleOrderUsecase({ runInTransaction: (work: any) => work(tx) } as any, saleOrderRepo as any, { update: jest.fn() } as any, transitionService as any, {} as any, accessControl as any);

    await usecase.execute({
      saleOrderId: "order-1", userId: "user-1", idempotencyKey: "99999999-9999-4999-8999-999999999999",
      resolutions: [{ incomeId: "payment-1", action: "TRANSFER_PENDING", targetSaleOrderId: "order-2", reason: "Asociar al pedido correcto" }],
    });

    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE sale_payments SET sale_order_id"), ["payment-1", "order-2", "user-1", "Asociar al pedido correcto"]);
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_order_auditory"), expect.arrayContaining(["payment_received_from_cancelled_order"]));
    expect(tx.manager.query).not.toHaveBeenCalledWith(expect.stringContaining("status = 'CANCELLED'"), expect.anything());
  });

  it("releases a posted allocation and applies the credit to a compatible destination without duplicating income", async () => {
    const payment = { id: "payment-1", sale_order_id: "order-1", amount: "20.00", currency: "PEN", status: "POSTED", version: 2 };
    const tx = { manager: { query: jest.fn(async (sql: string) => {
      if (sql.includes("SELECT client_id")) return [{ client_id: "client-1" }];
      if (sql.includes("FROM sale_payments")) return [payment];
      if (sql.includes("SELECT so.id, so.client_id")) return [{ id: "order-2", client_id: "client-1", currency: "PEN", total: "100.00", is_active: true, state_code: "OPEN" }];
      if (sql.includes("INSERT INTO financial_idempotency_records")) return [{ id: "idempotency-1" }];
      if (sql.includes("FROM sale_payment_allocations")) return [{ amount: "20.00" }];
      if (sql.includes("FROM customer_credit_movements")) return [{ amount: "0.00" }];
      if (sql.includes("AS reserved")) return [{ reserved: "10.00" }];
      return [];
    }) } };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1", clientId: "client-1", createdBy: "user-1" }),
      countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
    };
    const transitionService = { advance: jest.fn().mockResolvedValue({ order: { currentStateId: "cancelled" } }) };
    const accessControl = { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "customer_credits.apply"]) };
    const reconciliation = { reconcile: jest.fn() };
    const usecase = new CancelSaleOrderUsecase({ runInTransaction: (work: any) => work(tx) } as any, saleOrderRepo as any, { update: jest.fn() } as any, transitionService as any, {} as any, accessControl as any, reconciliation as any);

    await usecase.execute({
      saleOrderId: "order-1", userId: "user-1", idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      resolutions: [{ incomeId: "payment-1", action: "APPLY_TO_ORDER", targetSaleOrderId: "order-2", amount: 20, reason: "Aplicar al pedido activo" }],
    });

    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("'RELEASE'"), ["client-1", "payment-1", "order-1", 20, "PEN", "user-1", "Aplicar al pedido activo"]);
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("'APPLY'"), ["client-1", "payment-1", "order-1", "order-2", -20, "PEN", "user-1", "Aplicar al pedido activo"]);
    expect(tx.manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payment_allocations"), ["payment-1", "order-2", 20, "PEN", "user-1"]);
    expect(reconciliation.reconcile).toHaveBeenCalledWith(expect.objectContaining({ saleOrderId: "order-2" }), tx);
    expect(tx.manager.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO financial_account_movements"), expect.anything());
  });
});
