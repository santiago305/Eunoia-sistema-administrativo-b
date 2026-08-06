import { BadRequestException } from "@nestjs/common";
import { SaleOrderImportSkuResolverService } from "./sale-order-import-sku-resolver.service";

describe("SaleOrderImportSkuResolverService", () => {
  const product = {
    rawCode: "PRODUCTO-EVA001",
    productName: "PRODUCTO",
    variantName: null,
    skuName: "PRODUCTO",
    customSku: "EVA001",
    quantity: 1,
  };

  const buildService = (existingSku: any) => {
    const skuRepo = { findByCustomSku: jest.fn().mockResolvedValue(existingSku) };
    const stockItemRepo = { findBySkuId: jest.fn().mockResolvedValue({ id: "stock-1" }) };
    const inventoryRepo = { listByStockItemId: jest.fn().mockResolvedValue([]), upsert: jest.fn() };
    const createStockItem = { execute: jest.fn() };

    return {
      service: new SaleOrderImportSkuResolverService(
        skuRepo as any,
        stockItemRepo as any,
        inventoryRepo as any,
        createStockItem as any,
      ),
      skuRepo,
      createStockItem,
    };
  };

  it("uses an existing custom SKU even when the imported product name differs", async () => {
    const { service } = buildService({ sku: { id: "sku-1", productId: "product-1" } });

    await expect(service.resolveOrCreateSkus([product])).resolves.toEqual([
      expect.objectContaining({ productId: "product-1", skuId: "sku-1", customSku: "EVA001" }),
    ]);
  });

  it("rejects an unknown custom SKU without creating catalog records", async () => {
    const { service, createStockItem } = buildService(null);

    await expect(service.resolveOrCreateSkus([product])).rejects.toEqual(
      expect.any(BadRequestException),
    );
    expect(createStockItem.execute).not.toHaveBeenCalled();
  });
});
