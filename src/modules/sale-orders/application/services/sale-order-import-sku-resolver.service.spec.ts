import { SaleOrderImportSkuResolverService } from "./sale-order-import-sku-resolver.service";

describe("SaleOrderImportSkuResolverService", () => {
  it("creates imported skus without variant attributes through catalog sku creation", async () => {
    const productRepo = {
      findByName: jest.fn().mockResolvedValue(null),
    };
    const skuRepo = {
      findByCustomSku: jest.fn().mockResolvedValue(null),
    };
    const stockItemRepo = {
      findBySkuId: jest.fn().mockResolvedValue({ id: "stock-1" }),
    };
    const inventoryRepo = {
      listByStockItemId: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    };
    const createProductCatalogProduct = {
      execute: jest.fn().mockResolvedValue({ id: "product-1" }),
    };
    const createProductCatalogSku = {
      execute: jest.fn().mockResolvedValue({ sku: { id: "sku-1" } }),
    };
    const createProductCatalogStockItem = {
      execute: jest.fn(),
    };
    const tx = {
      manager: {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: "unit-1" }])
          .mockResolvedValueOnce([]),
      },
    };

    const service = new SaleOrderImportSkuResolverService(
      productRepo as any,
      skuRepo as any,
      stockItemRepo as any,
      inventoryRepo as any,
      createProductCatalogProduct as any,
      createProductCatalogSku as any,
      createProductCatalogStockItem as any,
    );

    await service.resolveOrCreateSkus(
      [
        {
          rawCode: "EVA001",
          productName: "Producto importado",
          variantName: "Azufre",
          skuName: "Producto importado Azufre",
          customSku: "EVA001",
          quantity: 1,
        },
      ],
      tx as any,
    );

    expect(createProductCatalogSku.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-1",
        customSku: "EVA001",
        name: "Producto importado Azufre",
        attributes: [],
      }),
    );
  });
});
