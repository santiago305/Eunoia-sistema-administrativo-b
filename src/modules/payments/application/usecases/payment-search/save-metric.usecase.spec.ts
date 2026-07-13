import { SavePaymentSearchMetricUsecase } from "./save-metric.usecase";
import { PAYMENT_SEARCH, PaymentSearchRepository } from "../../../domain/ports/payment-search.repository";
import {
  PaymentSearchFields,
  PaymentSearchOperators,
} from "../../dtos/payment-search/payment-search-snapshot";

describe("SavePaymentSearchMetricUsecase", () => {
  const repo: jest.Mocked<PaymentSearchRepository> = {
    touchRecentSearch: jest.fn(),
    listState: jest.fn(),
    createMetric: jest.fn(),
    deleteMetric: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("rejects empty payment metrics", async () => {
    const usecase = new SavePaymentSearchMetricUsecase(repo as any);

    const result = await usecase.execute({
      userId: "user-1",
      name: "Sin filtros",
      snapshot: { q: "   ", filters: [] },
    });

    expect(result).toEqual({
      type: "error",
      message: "No hay filtros para guardar en la metrica",
    });
    expect(repo.createMetric).not.toHaveBeenCalled();
  });

  it("saves sanitized metrics under the payments table key", async () => {
    repo.createMetric.mockResolvedValueOnce({
      metricId: "metric-1",
      name: "Pagos pendientes",
      snapshot: {
        q: "proveedor",
        filters: [
          {
            field: PaymentSearchFields.STATUS,
            operator: PaymentSearchOperators.IN,
            values: ["PENDING_APPROVAL"],
          },
        ],
      },
      updatedAt: new Date("2026-07-13T10:00:00.000Z"),
    });
    const usecase = new SavePaymentSearchMetricUsecase(repo as any);

    const result = await usecase.execute({
      userId: "user-1",
      name: "  Pagos pendientes  ",
      snapshot: {
        q: " proveedor ",
        filters: [
          {
            field: PaymentSearchFields.STATUS,
            operator: PaymentSearchOperators.IN,
            values: ["PENDING_APPROVAL", "PENDING_APPROVAL"],
          },
        ],
      },
    });

    expect(repo.createMetric).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "payments",
      name: "Pagos pendientes",
      snapshot: {
        q: "proveedor",
        filters: [
          {
            field: PaymentSearchFields.STATUS,
            operator: PaymentSearchOperators.IN,
            mode: "include",
            values: ["PENDING_APPROVAL"],
          },
        ],
      },
    });
    expect(result.type).toBe("success");
  });

  it("exposes the payment search injection token", () => {
    expect(PAYMENT_SEARCH).toBeDefined();
  });
});
