import { GetProductionOrderSearchStateUsecase } from "./get-state.usecase";

describe("GetProductionOrderSearchStateUsecase", () => {
  it("returns recent, saved and catalogs with built labels", async () => {
    const searchStorage = {
      listState: jest.fn().mockResolvedValue({
        recent: [
          {
            recentId: "recent-1",
            snapshot: { q: "orden", filters: [{ field: "status", operator: "in", values: ["DRAFT"] }] },
            lastUsedAt: new Date("2026-04-20T10:00:00.000Z"),
          },
        ],
        metrics: [
          {
            metricId: "metric-1",
            name: "Borradores",
            snapshot: { filters: [{ field: "skuId", operator: "in", values: ["sku-1"] }] },
            updatedAt: new Date("2026-04-20T11:00:00.000Z"),
          },
        ],
      }),
    };
    const filterOptionsRepo = {
      getOptions: jest.fn().mockResolvedValue({
        warehouses: [{ value: "wh-1", label: "Planta Central", active: true }],
        products: [{
          value: "sku-1",
          label: "SKU-001 - Producto A",
          active: true,
          sku: "SKU-001",
          skuId: "sku-1",
          stockItemId: "stock-1",
          backendSku: "SKU-001",
          customSku: null,
          name: "Producto A",
          productId: "product-1",
          productName: "Producto A",
          hasStockItem: true,
        }],
      }),
    };

    const useCase = new GetProductionOrderSearchStateUsecase(searchStorage as any, filterOptionsRepo as any);
    const result = await useCase.execute("user-1");

    expect(result.recent[0]).toMatchObject({
      recentId: "recent-1",
      label: expect.stringContaining("Busqueda: orden"),
    });
    expect(result.saved[0]).toMatchObject({
      metricId: "metric-1",
      name: "Borradores",
      label: expect.stringContaining("Producto: SKU-001 - Producto A"),
    });
    expect(result.catalogs.statuses).toHaveLength(5);
    expect(result.catalogs.warehouses).toEqual(filterOptionsRepo.getOptions.mock.results[0]?.value?.warehouses ?? result.catalogs.warehouses);
    expect(result.catalogs.products).toHaveLength(1);
  });
});
