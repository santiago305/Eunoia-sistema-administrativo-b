import { ListProductCatalogInventory } from "./list-inventory.usecase";

describe("ListProductCatalogInventory", () => {
  it("returns stockItemId and omits inventory rows whose SKU cannot be resolved", async () => {
    const inventoryRepo = {
      searchSnapshots: jest.fn().mockResolvedValue({
        items: [
          {
            stockItemId: "stock-1",
            skuId: "sku-1",
            warehouseId: "warehouse-1",
            warehouseName: "Central",
            locationId: null,
            onHand: 10,
            reserved: 2,
            available: 8,
            updatedAt: new Date(),
          },
          {
            stockItemId: "stock-orphan",
            skuId: "sku-deleted",
            warehouseId: "warehouse-1",
            warehouseName: "Central",
            locationId: null,
            onHand: 4,
            reserved: 0,
            available: 4,
            updatedAt: new Date(),
          },
        ],
        total: 2,
      }),
    };
    const skuRepo = {
      findById: jest.fn(async (id: string) => id === "sku-1"
        ? {
            sku: {
              id: "sku-1",
              productId: "product-1",
              backendSku: "SKU-1",
              customSku: null,
              name: "Producto",
            },
            unit: null,
            attributes: [],
          }
        : null),
    };
    const searchStorage = { touchRecentSearch: jest.fn() };
    const usecase = new ListProductCatalogInventory(
      inventoryRepo as any,
      skuRepo as any,
      searchStorage as any,
    );

    const result = await usecase.execute({ productType: "PRODUCT" as any, page: 1, limit: 25 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      stockItemId: "stock-1",
      warehouseId: "warehouse-1",
      sku: expect.objectContaining({ sku: expect.objectContaining({ id: "sku-1" }) }),
    }));
  });
});
