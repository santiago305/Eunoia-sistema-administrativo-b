import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { GetProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/get-stock-item.usecase";
import { GetProductCatalogSkuStockItem } from "src/modules/product-catalog/application/usecases/get-sku-stock-item.usecase";
import { ListProductCatalogInventoryBySku } from "src/modules/product-catalog/application/usecases/list-inventory-by-sku.usecase";
import { UpsertProductCatalogInventoryBalance } from "src/modules/product-catalog/application/usecases/upsert-inventory-balance.usecase";
import { CreateProductCatalogStockItemDto } from "../dtos/create-stock-item.dto";
import { RegisterProductCatalogInventoryMovementDto } from "../dtos/register-inventory-movement.dto";
import { UpsertProductCatalogInventoryBalanceDto } from "../dtos/upsert-inventory-balance.dto";
import { RegisterProductCatalogInventoryMovement } from "src/modules/product-catalog/application/usecases/register-inventory-movement.usecase";
import { ListProductCatalogInventoryLedger } from "src/modules/product-catalog/application/usecases/list-inventory-ledger.usecase";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { ListProductCatalogInventoryDocuments } from "src/modules/product-catalog/application/usecases/list-inventory-documents.usecase";
import { ListProductCatalogInventoryDocumentsDto } from "../dtos/list-inventory-documents.dto";
import { TransferProductCatalogInventoryBetweenWarehouses } from "src/modules/product-catalog/application/usecases/transfer-between-warehouses.usecase";
import { TransferBetweenWarehousesDto } from "../dtos/transfer-between-warehouses.dto";

@Controller()
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class ProductCatalogStockController {
  constructor(
    private readonly createStockItem: CreateProductCatalogStockItem,
    private readonly getStockItem: GetProductCatalogStockItem,
    private readonly getSkuStockItem: GetProductCatalogSkuStockItem,
    private readonly upsertInventoryBalance: UpsertProductCatalogInventoryBalance,
    private readonly listInventoryBySku: ListProductCatalogInventoryBySku,
    private readonly registerMovement: RegisterProductCatalogInventoryMovement,
    private readonly transferBetweenWarehouses: TransferProductCatalogInventoryBetweenWarehouses,
    private readonly listLedger: ListProductCatalogInventoryLedger,
    private readonly listDocuments: ListProductCatalogInventoryDocuments,
  ) {}

  @Post("skus/:id/stock-item")
  createForSku(@Param("id", ParseUUIDPipe) skuId: string, @Body() dto: CreateProductCatalogStockItemDto) {
    return this.createStockItem.execute({ skuId, ...dto });
  }

  @Get("skus/:id/stock-item")
  getBySku(@Param("id", ParseUUIDPipe) skuId: string) {
    return this.getSkuStockItem.execute(skuId);
  }

  @Get("stock-items/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getStockItem.execute(id);
  }

  @Get("skus/:id/stock")
  listBySku(@Param("id", ParseUUIDPipe) skuId: string) {
    return this.listInventoryBySku.execute(skuId);
  }

  @Post("stock-items/:id/balances")
  upsertBalance(@Param("id", ParseUUIDPipe) stockItemId: string, @Body() dto: UpsertProductCatalogInventoryBalanceDto) {
    return this.upsertInventoryBalance.execute({ stockItemId, ...dto });
  }

  @Post("stock-items/movements/create")
  registerInventoryMovement(
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterProductCatalogInventoryMovementDto,
  ) {
    return this.registerMovement.execute({ ...dto, createdBy:user.id });
  }

  @Post("stock-items/movements/transfer")
  transferInventoryBetweenWarehouses(
    @CurrentUser() user: { id: string },
    @Body() dto: TransferBetweenWarehousesDto,
  ) {
    return this.transferBetweenWarehouses.execute({ ...dto, createdBy: user.id });
  }

  @Get("stock-items/:id/ledger")
  ledger(@Param("id", ParseUUIDPipe) stockItemId: string) {
    return this.listLedger.execute(stockItemId);
  }

  @Get("inventory-documents")
  listInventoryDocuments(@Query() query: ListProductCatalogInventoryDocumentsDto) {
    return this.listDocuments.execute({
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
      warehouseIds: query.warehouseIds ?? (query.warehouseId ? [query.warehouseId] : undefined),
      docType: query.docType,
      productType: query.productType,
      status: query.status,
      q: query.q,
    });
  }
}

