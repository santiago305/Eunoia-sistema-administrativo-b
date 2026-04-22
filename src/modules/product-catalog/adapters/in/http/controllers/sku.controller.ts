import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
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

@Controller()
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class ProductCatalogSkuController {
  constructor(
    private readonly createSku: CreateProductCatalogSku,
    private readonly updateSku: UpdateProductCatalogSku,
    private readonly listSkus: ListProductCatalogSkus,
    private readonly getSku: GetProductCatalogSku,
    private readonly getStock: GetSnapshotInventory,
    private readonly listSnapshots: ListProductCatalogInventorySnapshotsBySku,
    private readonly listAvailable: ListAvailableStockUsecase,
  ) {}

  @Post("products/:id/skus")
  create(@Param("id", ParseUUIDPipe) productId: string, @Body() dto: CreateProductCatalogSkuDto) {
    return this.createSku.execute({ productId, ...dto });
  }

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

  @Get("skus/get-stock")
  getSkuStock(@Query() query: getStockDto) {
    return this.getStock.execute(query);
  }

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

  @Get("skus/:id/stock/snapshots")
  listSkuStockSnapshots(@Param("id", ParseUUIDPipe) skuId: string, @Query() query: ListSkuStockSnapshotsDto) {
    return this.listSnapshots.execute({
      skuId,
      warehouseId: query.warehouseId,
    });
  }

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
  @Get("skus/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getSku.execute(id);
  }
  

  @Patch("skus/:id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProductCatalogSkuDto) {
    return this.updateSku.execute(id, dto);
  }
}
