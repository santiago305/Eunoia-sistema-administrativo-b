import "reflect-metadata";
import { CanActivate, ExecutionContext, ForbiddenException, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { ProductCatalogProductController } from "./product.controller";
import { CreateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/create-product.usecase";
import { UpdateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/update-product.usecase";
import { ListProductCatalogProducts } from "src/modules/product-catalog/application/usecases/list-products.usecase";
import { GetProductCatalogProduct } from "src/modules/product-catalog/application/usecases/get-product.usecase";
import { GetProductCatalogProductDetail } from "src/modules/product-catalog/application/usecases/get-product-detail.usecase";
import { GetProductCatalogProductSearchStateUsecase } from "src/modules/product-catalog/application/usecases/product-search/get-state.usecase";
import { SaveProductCatalogProductSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/product-search/save-metric.usecase";
import { DeleteProductCatalogProductSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/product-search/delete-metric.usecase";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";

@Injectable()
class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { id: "user-1" };
    return true;
  }
}

@Injectable()
class AllowGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe("ProductCatalogProductController export", () => {
  let app: INestApplication;
  const listProducts = { execute: jest.fn() };
  const getProduct = { execute: jest.fn() };
  const updateProduct = { execute: jest.fn() };
  const accessControlService = { userHasAllPermissions: jest.fn() };
  const listingSearchStorage = {
    listState: jest.fn(),
    createMetric: jest.fn(),
    deleteMetric: jest.fn(),
  };

  beforeEach(async () => {
    listProducts.execute.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    listingSearchStorage.listState.mockResolvedValue({ metrics: [] });
    listingSearchStorage.createMetric.mockResolvedValue({ type: "success", message: "Preset guardado" });
    listingSearchStorage.deleteMetric.mockResolvedValue({ type: "success", message: "Preset eliminado" });
    getProduct.execute.mockResolvedValue({
      product: { id: "product-1", type: ProductCatalogProductType.PRODUCT },
    });
    updateProduct.execute.mockResolvedValue({ id: "product-1" });
    accessControlService.userHasAllPermissions.mockResolvedValue(true);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductCatalogProductController],
      providers: [
        { provide: CreateProductCatalogProduct, useValue: { execute: jest.fn() } },
        { provide: UpdateProductCatalogProduct, useValue: updateProduct },
        { provide: ListProductCatalogProducts, useValue: listProducts },
        { provide: GetProductCatalogProduct, useValue: getProduct },
        { provide: GetProductCatalogProductDetail, useValue: { execute: jest.fn() } },
        { provide: GetProductCatalogProductSearchStateUsecase, useValue: { execute: jest.fn() } },
        { provide: SaveProductCatalogProductSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductCatalogProductSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: AccessControlService, useValue: accessControlService },
        { provide: LISTING_SEARCH_STORAGE, useValue: listingSearchStorage },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(CompanyConfiguredGuard)
      .useClass(AllowGuard)
      .overrideGuard(PermissionsGuard)
      .useClass(AllowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it("lists export columns for the requested product type", async () => {
    listProducts.execute.mockResolvedValueOnce({
      items: [
        {
          id: "product-1",
          name: "Producto A",
          description: "Descripcion",
          brand: "Marca",
          skuCount: 2,
          isActive: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });

    const response = await request(app.getHttpServer())
      .get("/products/export-columns")
      .query({ type: ProductCatalogProductType.PRODUCT })
      .expect(200);

    expect(listProducts.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ProductCatalogProductType.PRODUCT,
        requestedBy: "user-1",
      }),
    );
    expect(response.body).toEqual(
      expect.arrayContaining([
        { key: "name", label: "Nombre" },
        { key: "skuCount", label: "Variantes" },
        { key: "isActive", label: "Activo" },
      ]),
    );
  });

  it("checks the exact product type permission before updating", async () => {
    getProduct.execute.mockResolvedValueOnce({
      product: { id: "material-1", type: ProductCatalogProductType.MATERIAL },
    });

    await request(app.getHttpServer())
      .patch("/products/11111111-1111-4111-8111-111111111111")
      .send({ name: "Materia editada" })
      .expect(200);

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["materials.update"]);
    expect(updateProduct.execute).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", expect.any(Object));
  });

  it("rejects update when the exact product type permission is denied", async () => {
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(false);

    await request(app.getHttpServer())
      .patch("/products/11111111-1111-4111-8111-111111111111")
      .send({ name: "Producto editado" })
      .expect(403);

    expect(accessControlService.userHasAllPermissions).toHaveBeenCalledWith("user-1", ["products.update"]);
    expect(updateProduct.execute).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException from the type-aware permission check", async () => {
    const controller = app.get(ProductCatalogProductController);
    accessControlService.userHasAllPermissions.mockResolvedValueOnce(false);

    await expect(
      controller.update("11111111-1111-4111-8111-111111111111", { name: "Producto editado" } as any, { id: "user-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateProduct.execute).not.toHaveBeenCalled();
  });
});
