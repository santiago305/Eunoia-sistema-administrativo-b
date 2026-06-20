import { ForbiddenException } from "@nestjs/common";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { ProductCatalogSkuController } from "./sku.controller";

describe("ProductCatalogSkuController permissions", () => {
  const createSku = { execute: jest.fn() };
  const updateSku = { execute: jest.fn() };
  const listSkus = { execute: jest.fn() };
  const getSku = { execute: jest.fn() };
  const getStock = { execute: jest.fn() };
  const listSnapshots = { execute: jest.fn() };
  const listAvailable = { execute: jest.fn() };
  const getProduct = { execute: jest.fn() };
  const accessControlService = { userHasAllPermissions: jest.fn() };

  const controller = new ProductCatalogSkuController(
    createSku as any,
    updateSku as any,
    listSkus as any,
    getSku as any,
    getStock as any,
    listSnapshots as any,
    listAvailable as any,
    getProduct as any,
    accessControlService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    createSku.execute.mockResolvedValue({ id: "sku-1" });
    updateSku.execute.mockResolvedValue({ id: "sku-1" });
    getProduct.execute.mockResolvedValue({ product: { id: "product-1", type: ProductCatalogProductType.PRODUCT } });
    getSku.execute.mockResolvedValue({ sku: { id: "sku-1", productId: "product-1" } });
  });

  it("requires the product create permission before creating a SKU", async () => {
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(true);

    await controller.create("11111111-1111-4111-8111-111111111111", { name: "SKU A" } as any, { id: "user-1" });

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["products.create"]);
    expect(createSku.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "11111111-1111-4111-8111-111111111111",
        name: "SKU A",
      }),
    );
  });

  it("rejects SKU creation when the material create permission is denied", async () => {
    getProduct.execute.mockResolvedValueOnce({ product: { id: "material-1", type: ProductCatalogProductType.MATERIAL } });
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(false);

    await expect(
      controller.create("22222222-2222-4222-8222-222222222222", { name: "SKU materia" } as any, { id: "user-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["materials.create"]);
    expect(createSku.execute).not.toHaveBeenCalled();
  });

  it("rejects SKU updates when the exact product type update permission is denied", async () => {
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(false);

    await expect(
      controller.update("33333333-3333-4333-8333-333333333333", { name: "SKU editado" } as any, { id: "user-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(getSku.execute).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333");
    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["products.update"]);
    expect(updateSku.execute).not.toHaveBeenCalled();
  });
});
