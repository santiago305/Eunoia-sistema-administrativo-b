import { ForbiddenException } from "@nestjs/common";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogStockController } from "./stock.controller";

describe("ProductCatalogStockController permissions", () => {
  const createStockItem = { execute: jest.fn() };
  const processDocument = { execute: jest.fn() };
  const getSku = { execute: jest.fn() };
  const getProduct = { execute: jest.fn() };
  const accessControlService = { userHasAllPermissions: jest.fn() };
  const documentRepo = { findById: jest.fn() };

  const noop = { execute: jest.fn() };

  const controller = new ProductCatalogStockController(
    createStockItem as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    processDocument as any,
    noop as any,
    noop as any,
    noop as any,
    getSku as any,
    getProduct as any,
    accessControlService as any,
    {} as any,
    {} as any,
    documentRepo as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    createStockItem.execute.mockResolvedValue({ id: "stock-item-1" });
    processDocument.execute.mockResolvedValue({ id: "document-1" });
    getSku.execute.mockResolvedValue({ sku: { id: "sku-1", productId: "product-1" } });
    getProduct.execute.mockResolvedValue({ product: { id: "product-1", type: ProductCatalogProductType.PRODUCT } });
    documentRepo.findById.mockResolvedValue({
      id: "document-1",
      docType: DocType.TRANSFER,
      productType: ProductCatalogProductType.PRODUCT,
    });
  });

  it("requires the exact product SKU create permission before creating stock items", async () => {
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(true);

    await controller.createForSku(
      "11111111-1111-4111-8111-111111111111",
      { initialQuantity: 0 } as any,
      { id: "user-1" },
    );

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["products.skus.create"]);
    expect(createStockItem.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        skuId: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });

  it("rejects stock item creation when the exact material SKU create permission is denied", async () => {
    getProduct.execute.mockResolvedValueOnce({ product: { id: "material-1", type: ProductCatalogProductType.MATERIAL } });
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(false);

    await expect(
      controller.createForSku("22222222-2222-4222-8222-222222222222", { initialQuantity: 0 } as any, { id: "user-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["materials.skus.create"]);
    expect(createStockItem.execute).not.toHaveBeenCalled();
  });

  it("requires the exact transfer process permission before processing inventory documents", async () => {
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(true);

    await controller.processInventoryDocument("33333333-3333-4333-8333-333333333333", { id: "user-1" });

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["transfers.products.process"]);
    expect(processDocument.execute).toHaveBeenCalledWith({
      docId: "33333333-3333-4333-8333-333333333333",
      postedBy: "user-1",
    });
  });

  it("rejects adjustment processing when the exact material process permission is denied", async () => {
    documentRepo.findById.mockResolvedValueOnce({
      id: "document-2",
      docType: DocType.ADJUSTMENT,
      productType: ProductCatalogProductType.MATERIAL,
    });
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(false);

    await expect(
      controller.processInventoryDocument("44444444-4444-4444-8444-444444444444", { id: "user-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["adjustments.materials.process"]);
    expect(processDocument.execute).not.toHaveBeenCalled();
  });
});
