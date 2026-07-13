import { GetRecurringPurchaseSearchStateUsecase } from "./get-state.usecase";

describe("GetRecurringPurchaseSearchStateUsecase", () => {
  it("returns recent searches, saved metrics and backend catalogs for recurring purchases", async () => {
    const searchRepo = {
      listState: jest.fn(async () => ({
        recent: [
          {
            recentId: "recent-1",
            snapshot: {
              q: "hosting",
              filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
            },
            lastUsedAt: new Date("2026-07-12T10:00:00.000Z"),
          },
        ],
        metrics: [
          {
            metricId: "metric-1",
            name: "Activas",
            snapshot: {
              q: "",
              filters: [{ field: "supplierId", operator: "in", values: ["supplier-1"] }],
            },
            updatedAt: new Date("2026-07-12T11:00:00.000Z"),
          },
        ],
        suppliers: [{ supplierId: "supplier-1", label: "Proveedor Uno" }],
      })),
    };
    const usecase = new GetRecurringPurchaseSearchStateUsecase(searchRepo as any);

    await expect(usecase.execute("user-1")).resolves.toEqual({
      recent: [
        {
          recentId: "recent-1",
          label: "Busqueda: hosting | Estado: Activa",
          snapshot: {
            q: "hosting",
            filters: [{ field: "status", operator: "in", mode: "include", values: ["ACTIVE"] }],
          },
          lastUsedAt: new Date("2026-07-12T10:00:00.000Z"),
        },
      ],
      saved: [
        {
          metricId: "metric-1",
          name: "Activas",
          label: "Proveedor: Proveedor Uno",
          snapshot: {
            filters: [{ field: "supplierId", operator: "in", mode: "include", values: ["supplier-1"] }],
          },
          updatedAt: new Date("2026-07-12T11:00:00.000Z"),
        },
      ],
      catalogs: {
        suppliers: [{ id: "supplier-1", label: "Proveedor Uno" }],
        statuses: [
          { id: "ACTIVE", label: "Activa" },
          { id: "PAUSED", label: "Pausada" },
          { id: "CANCELLED", label: "Cancelada" },
        ],
        frequencies: [
          { id: "MONTHLY", label: "Mensual" },
          { id: "ANNUAL", label: "Anual" },
        ],
        purchaseTypes: [
          { id: "SERVICE", label: "Servicio" },
          { id: "SUBSCRIPTION", label: "Suscripcion" },
        ],
        currencies: [
          { id: "PEN", label: "PEN" },
          { id: "USD", label: "USD" },
        ],
        paymentStatuses: [
          { id: "PENDING", label: "Pendiente" },
          { id: "PARTIAL", label: "Parcial" },
          { id: "PAID", label: "Pagado" },
          { id: "OVERDUE", label: "Vencido" },
        ],
      },
    });
    expect(searchRepo.listState).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "recurring-purchases",
    });
  });
});
