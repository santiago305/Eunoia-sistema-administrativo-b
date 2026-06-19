import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequireAnyPermissionGroups, RequireDynamicPermissionGroups } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductCatalogSku } from "src/modules/product-catalog/application/usecases/create-sku.usecase";
import { GetProductCatalogSku } from "src/modules/product-catalog/application/usecases/get-sku.usecase";
import { ListProductCatalogSkus } from "src/modules/product-catalog/application/usecases/list-skus.usecase";
import { UpdateProductCatalogSku } from "src/modules/product-catalog/application/usecases/update-sku.usecase";
import { CreateProductCatalogSkuDto } from "../dtos/create-sku.dto";
import { ListProductCatalogSkusDto } from "../dtos/list-skus.dto";
import { UpdateProductCatalogSkuDto } from "../dtos/update-sku.dto";
import { GetSnapshotInventory } from "src/modules/product-catalog/application/usecases/get-snapshot.usecase";
import { GetSkuStockSnapshotDto, getStockDto } from "../dtos/get-stock.dto";
import { ListProductCatalogInventorySnapshotsBySku } from "src/modules/product-catalog/application/usecases/list-snapshots.usecase";
import { ListSkuStockSnapshotsDto } from "../dtos/list-sku-stock-snapshots.dto";
import { ListSkuStockSnapshotsSearchDto } from "../dtos/list-sku-stock-snapshots-search.dto";
import { ListAvailableStockUsecase } from "src/modules/product-catalog/application/usecases/list-available-stock";
import { inventoryPermissionGroupsFromRequest, productCatalogPermissionGroupsFromRequest } from "./catalog-permission-groups";
import { GetProductCatalogProduct } from "src/modules/product-catalog/application/usecases/get-product.usecase";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";

@Controller()
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ProductCatalogSkuController {
  constructor(
    private readonly createSku: CreateProductCatalogSku,
    private readonly updateSku: UpdateProductCatalogSku,
    private readonly listSkus: ListProductCatalogSkus,
    private readonly getSku: GetProductCatalogSku,
    private readonly getStock: GetSnapshotInventory,
    private readonly listSnapshots: ListProductCatalogInventorySnapshotsBySku,
    private readonly listAvailable: ListAvailableStockUsecase,
    private readonly getProduct: GetProductCatalogProduct,
    private readonly accessControlService: AccessControlService,
  ) {}

  @RequireAnyPermissionGroups(["products.skus.create", "materials.skus.create"])
  @Post("products/:id/skus")
  async create(
    @Param("id", ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductCatalogSkuDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.ensureProductPermission(user.id, productId, "skus.create");
    return this.createSku.execute({ productId, ...dto });
  }

  @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("view_detail", "catalog.read"))
  @Get("skus")
  list(@Query() query: ListProductCatalogSkusDto) {
    return this.listSkus.execute({
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      productId: query.productId,
      productType: query.productType,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    });
  }

  @RequireDynamicPermissionGroups(productCatalogPermissionGroupsFromRequest("view_detail", "catalog.read"))
  @Get("products/:id/skus")
  listByProduct(@Param("id", ParseUUIDPipe) productId: string, @Query() query: ListProductCatalogSkusDto) {
    return this.listSkus.execute({
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      productId,
      productType: query.productType,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    });
  }

  @RequireDynamicPermissionGroups(inventoryPermissionGroupsFromRequest("view"))
  @Get("skus/get-stock")
  getSkuStock(@Query() query: getStockDto) {
    return this.getStock.execute(query);
  }

  @RequireAnyPermissionGroups(["inventory.products.view", "inventory.materials.view", "catalog.read"])
  @Get("skus/:id/stock/snapshot")
  getSkuStockSnapshot(
    @Param("id", ParseUUIDPipe) skuId: string,
    @Query() query: GetSkuStockSnapshotDto,
  ) {
    return this.getStock.execute({
      skuId,
      warehouseId: query.warehouseId,
      locationId: query.locationId,
    });
  }

  @RequireAnyPermissionGroups(["inventory.forecast.view", "catalog.read"])
  @Get("skus/:id/stock/snapshots")
  listSkuStockSnapshots(@Param("id", ParseUUIDPipe) skuId: string, @Query() query: ListSkuStockSnapshotsDto) {
    return this.listSnapshots.execute({
      skuId,
      warehouseId: query.warehouseId,
    });
  }

  @RequireDynamicPermissionGroups(inventoryPermissionGroupsFromRequest("view"))
  @Get("available-stock/skus")
  listSkuStockSnapshotsSearch(@Query() query: ListSkuStockSnapshotsSearchDto) {
    return this.listAvailable.execute({
      warehouseId: query.warehouseId,
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      skuId: query.skuId,
      productType: query.productType,
    });
  }
  @RequireAnyPermissionGroups(["products.view_detail", "materials.view_detail", "catalog.read"])
  @Get("skus/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getSku.execute(id);
  }
  

  @RequireAnyPermissionGroups(["products.skus.update", "materials.skus.update"])
  @Patch("skus/:id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCatalogSkuDto,
    @CurrentUser() user: { id: string },
  ) {
    const sku = await this.getSku.execute(id);
    await this.ensureProductPermission(user.id, sku.sku.productId, "skus.update");
    return this.updateSku.execute(id, dto);
  }

  private async ensureProductPermission(userId: string, productId: string, action: "skus.create" | "skus.update") {
    const { product } = await this.getProduct.execute(productId);
    const prefix = product.type === ProductCatalogProductType.MATERIAL ? "materials" : "products";
    const allowed = await this.accessControlService.userHasAllPermissions(userId, [`${prefix}.${action}`]);
    if (!allowed) throw new ForbiddenException("Acceso denegado: permisos insuficientes");
  }
}
