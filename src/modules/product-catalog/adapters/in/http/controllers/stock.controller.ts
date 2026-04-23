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
import { ListDailyMovementBySku } from "src/modules/product-catalog/application/usecases/list-daily-movement-by-sku.usecase";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { ListProductCatalogInventoryDocuments } from "src/modules/product-catalog/application/usecases/list-inventory-documents.usecase";
import { ListProductCatalogInventoryDocumentsDto } from "../dtos/list-inventory-documents.dto";
import { TransferProductCatalogInventoryBetweenWarehouses } from "src/modules/product-catalog/application/usecases/transfer-between-warehouses.usecase";
import { TransferBetweenWarehousesDto } from "../dtos/transfer-between-warehouses.dto";
import { ListProductCatalogInventoryLedgerDto } from "../dtos/list-inventory-ledger.dto";
import { ListDailyMovementBySkuDto } from "../dtos/list-daily-movement-by-sku.dto";
import { ListProductCatalogInventory } from "src/modules/product-catalog/application/usecases/list-inventory.usecase";
import { ListProductCatalogInventoryDto } from "../dtos/list-inventory.dto";
import type { ProductCatalogInventorySearchRule } from "src/modules/product-catalog/domain/ports/inventory.repository";

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
    private readonly listDailyMovementBySku: ListDailyMovementBySku,
    private readonly listDocuments: ListProductCatalogInventoryDocuments,
    private readonly listInventory: ListProductCatalogInventory,
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
  
  @Get("stock-items/ledger/by-sku")
  ledgerBySku(@Query() query: ListProductCatalogInventoryLedgerDto) {
    return this.listLedger.execute(query);
  }

  @Get("stock-items/ledger/daily-totals/by-sku")
  dailyTotalsBySku(@Query() query: ListDailyMovementBySkuDto) {
    return this.listDailyMovementBySku.execute(query);
  }

  @Get("stock-items/:id/ledger")
  ledger(@Param("id", ParseUUIDPipe) stockItemId: string, @Query() query: ListProductCatalogInventoryLedgerDto) {
    return this.listLedger.execute({ stockItemId, ...query });
  }


  @Get("inventory-documents")
  listInventoryDocuments(@Query() query: ListProductCatalogInventoryDocumentsDto) {
    return this.listDocuments.execute({
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
      warehouseIds: query.warehouseIds ?? (query.warehouseId ? [query.warehouseId] : undefined),
      warehouseIdsIn: query.warehouseIdsIn,
      warehouseIdsNotIn: query.warehouseIdsNotIn,
      docType: query.docType,
      productType: query.productType,
      status: query.status,
      q: query.q,
      includeItems: query.includeItems === undefined ? undefined : query.includeItems === "true",
      createdById: query.createdById,
      createdByIdsIn: query.createdByIdsIn,
      createdByIdsNotIn: query.createdByIdsNotIn,
    });
  }

  @Get("inventory")
  listInventoryRows(@Query() query: ListProductCatalogInventoryDto) {
    return this.listInventory.execute({
      warehouseId: query.warehouseId,
      warehouseIdsIn: query.warehouseIdsIn,
      warehouseIdsNotIn: query.warehouseIdsNotIn,
      q: query.q,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      skuId: query.skuId,
      skuIdsIn: query.skuIdsIn,
      skuIdsNotIn: query.skuIdsNotIn,
      productType: query.productType,
      filters: this.parseInventoryFilters(query.filters),
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  private parseInventoryFilters(raw?: string): ProductCatalogInventorySearchRule[] | undefined {
    if (!raw?.trim()) return undefined;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProductCatalogInventorySearchRule[]) : undefined;
    } catch {
      return undefined;
    }
  }
}
