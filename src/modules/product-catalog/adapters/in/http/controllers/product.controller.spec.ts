import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
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

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductCatalogProductController],
      providers: [
        { provide: CreateProductCatalogProduct, useValue: { execute: jest.fn() } },
        { provide: UpdateProductCatalogProduct, useValue: { execute: jest.fn() } },
        { provide: ListProductCatalogProducts, useValue: listProducts },
        { provide: GetProductCatalogProduct, useValue: { execute: jest.fn() } },
        { provide: GetProductCatalogProductDetail, useValue: { execute: jest.fn() } },
        { provide: GetProductCatalogProductSearchStateUsecase, useValue: { execute: jest.fn() } },
        { provide: SaveProductCatalogProductSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductCatalogProductSearchMetricUsecase, useValue: { execute: jest.fn() } },
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
});
