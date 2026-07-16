import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { RecurringPurchasesController } from "./recurring-purchases.controller";

describe("RecurringPurchasesController", () => {
  const buildController = () => {
    const registerRecurringPayment = {
      execute: jest.fn(async () => ({
        type: "success",
        paymentId: "payment-1",
        purchaseId: "purchase-1",
        accountPayableId: "payable-1",
      })),
    };
    const listRecurringPurchases = { execute: jest.fn(async () => ({ items: [], total: 0, page: 1, limit: 25 })) };
    const getSearchState = { execute: jest.fn(async () => ({ recent: [], saved: [], catalogs: { suppliers: [] } })) };
    const saveSearchMetric = { execute: jest.fn(async () => ({ type: "success", message: "Metrica guardada" })) };
    const deleteSearchMetric = { execute: jest.fn(async () => ({ type: "success", message: "Metrica eliminada" })) };
    const listingSearchStorage = {
      listState: jest.fn(async () => ({ metrics: [] })),
      createMetric: jest.fn(async () => ({ type: "success", message: "Preset guardado" })),
      deleteMetric: jest.fn(async () => ({ type: "success", message: "Preset eliminado" })),
    };
    const controller = new RecurringPurchasesController(
      {} as any,
      {} as any,
      listRecurringPurchases as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      registerRecurringPayment as any,
      {} as any,
      getSearchState as any,
      saveSearchMetric as any,
      deleteSearchMetric as any,
      listingSearchStorage as any,
    );

    return { controller, registerRecurringPayment, listRecurringPurchases, getSearchState, saveSearchMetric, deleteSearchMetric };
  };

  it("passes the current user to the list usecase for recent smart searches", async () => {
    const { controller, listRecurringPurchases } = buildController();

    await controller.list(
      {
        q: "hosting",
        filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }] as any,
      } as any,
      { id: "22222222-2222-4222-8222-222222222222" },
    );

    expect(listRecurringPurchases.execute).toHaveBeenCalledWith({
      q: "hosting",
      filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
      requestedBy: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns recurring purchase search state for the current user", async () => {
    const { controller, getSearchState } = buildController();

    await controller.getSearchStateForUser({ id: "22222222-2222-4222-8222-222222222222" });

    expect(getSearchState.execute).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
  });

  it("saves and deletes recurring purchase search metrics for the current user", async () => {
    const { controller, saveSearchMetric, deleteSearchMetric } = buildController();

    await controller.saveMetric(
      {
        name: "Activas",
        snapshot: {
          q: "hosting",
          filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
        },
      } as any,
      { id: "22222222-2222-4222-8222-222222222222" },
    );
    await controller.deleteMetric(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      { id: "22222222-2222-4222-8222-222222222222" },
    );

    expect(saveSearchMetric.execute).toHaveBeenCalledWith({
      userId: "22222222-2222-4222-8222-222222222222",
      name: "Activas",
      snapshot: {
        q: "hosting",
        filters: [{ field: "status", operator: "in", mode: "include", values: ["ACTIVE"] }],
      },
    });
    expect(deleteSearchMetric.execute).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("registers a payment for a recurring purchase", async () => {
    const { controller, registerRecurringPayment } = buildController();

    const result = await controller.registerPayment(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        method: "Transferencia",
        date: "2026-07-10",
        currency: CurrencyType.PEN,
        amount: 120,
        operationNumber: "OP-123",
        paymentEvidenceFileId: "77777777-7777-4777-8777-777777777777",
      },
      { id: "22222222-2222-4222-8222-222222222222" },
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: "success",
        paymentId: "payment-1",
      }),
    );
    expect(registerRecurringPayment.execute).toHaveBeenCalledWith({
      templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: "22222222-2222-4222-8222-222222222222",
      payment: {
        method: "Transferencia",
        date: "2026-07-10",
        currency: CurrencyType.PEN,
        amount: 120,
        operationNumber: "OP-123",
        paymentEvidenceFileId: "77777777-7777-4777-8777-777777777777",
      },
    });
  });
});
