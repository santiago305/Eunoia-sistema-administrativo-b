import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
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
import { ListProductCatalogInventoryLedgerMovements } from "src/modules/product-catalog/application/usecases/list-inventory-ledger-movements.usecase";
import { ListProductCatalogInventoryDto } from "../dtos/list-inventory.dto";
import type { ProductCatalogInventorySearchRule } from "src/modules/product-catalog/domain/ports/inventory.repository";
import { GetInventorySearchStateUsecase } from "src/modules/product-catalog/application/usecases/inventory-search/get-state.usecase";
import { SaveInventorySearchMetricUsecase } from "src/modules/product-catalog/application/usecases/inventory-search/save-metric.usecase";
import { DeleteInventorySearchMetricUsecase } from "src/modules/product-catalog/application/usecases/inventory-search/delete-metric.usecase";
import { HttpCreateInventorySearchMetricDto } from "../dtos/http-inventory-search-metric-create.dto";
import { sanitizeInventorySearchSnapshot } from "src/modules/product-catalog/application/support/inventory-search.utils";
import { GetInventoryDocumentsSearchStateUsecase } from "src/modules/product-catalog/application/usecases/inventory-documents-search/get-state.usecase";
import { SaveInventoryDocumentsSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/inventory-documents-search/save-metric.usecase";
import { DeleteInventoryDocumentsSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/inventory-documents-search/delete-metric.usecase";
import { HttpCreateInventoryDocumentsSearchMetricDto } from "../dtos/http-inventory-documents-search-metric-create.dto";
import type { InventoryDocumentsSearchRule } from "src/modules/product-catalog/application/dtos/inventory-documents-search/inventory-documents-search-snapshot";
import {
  sanitizeInventoryDocumentsSearchSnapshot,
} from "src/modules/product-catalog/application/support/inventory-documents-search.utils";
import { GetInventoryLedgerSearchStateUsecase } from "src/modules/product-catalog/application/usecases/inventory-ledger-search/get-state.usecase";
import { SaveInventoryLedgerSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/inventory-ledger-search/save-metric.usecase";
import { DeleteInventoryLedgerSearchMetricUsecase } from "src/modules/product-catalog/application/usecases/inventory-ledger-search/delete-metric.usecase";
import { HttpCreateInventoryLedgerSearchMetricDto } from "../dtos/http-inventory-ledger-search-metric-create.dto";
import { ListProductCatalogInventoryLedgerMovementsDto } from "../dtos/list-inventory-ledger-movements.dto";
import type { InventoryLedgerSearchRule } from "src/modules/product-catalog/application/dtos/inventory-ledger-search/inventory-ledger-search-snapshot";
import { sanitizeInventoryLedgerSearchSnapshot } from "src/modules/product-catalog/application/support/inventory-ledger-search.utils";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

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
    private readonly getInventorySearchStateUc: GetInventorySearchStateUsecase,
    private readonly saveInventorySearchMetricUc: SaveInventorySearchMetricUsecase,
    private readonly deleteInventorySearchMetricUc: DeleteInventorySearchMetricUsecase,
    private readonly getInventoryDocsSearchState: GetInventoryDocumentsSearchStateUsecase,
    private readonly saveInventoryDocsSearchMetric: SaveInventoryDocumentsSearchMetricUsecase,
    private readonly deleteInventoryDocsSearchMetric: DeleteInventoryDocumentsSearchMetricUsecase,
    private readonly listLedgerMovements: ListProductCatalogInventoryLedgerMovements,
    private readonly getInventoryLedgerSearchStateUc: GetInventoryLedgerSearchStateUsecase,
    private readonly saveInventoryLedgerSearchMetricUc: SaveInventoryLedgerSearchMetricUsecase,
    private readonly deleteInventoryLedgerSearchMetricUc: DeleteInventoryLedgerSearchMetricUsecase,
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


  @Get("inventory-documents/search-state")
  getInventoryDocumentsSearchState(
    @CurrentUser() user: { id: string },
    @Query("docType") docType: DocType,
    @Query("productType") productType?: ProductCatalogProductType,
  ) {
    return this.getInventoryDocsSearchState.execute({ userId: user.id, docType, productType });
  }

  @Get("inventory/search-state")
  getInventorySearchState(
    @CurrentUser() user: { id: string },
    @Query("productType") productType?: ProductCatalogProductType,
  ) {
    return this.getInventorySearchStateUc.execute({ userId: user.id, productType });
  }

  @Post("inventory/search-metrics")
  saveInventorySearchMetric(
    @Body() dto: HttpCreateInventorySearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveInventorySearchMetricUc.execute({
      userId: user.id,
      name: dto.name,
      productType: dto.productType,
      snapshot: sanitizeInventorySearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("inventory/search-metrics/:metricId")
  deleteInventorySearchMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
    @Query("productType") productType?: ProductCatalogProductType,
  ) {
    return this.deleteInventorySearchMetricUc.execute({
      userId: user.id,
      metricId,
      productType,
    });
  }

  @Post("inventory-documents/search-metrics")
  saveInventoryDocumentsSearchMetric(
    @Body() dto: HttpCreateInventoryDocumentsSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveInventoryDocsSearchMetric.execute({
      userId: user.id,
      name: dto.name,
      docType: dto.docType,
      productType: dto.productType,
      snapshot: sanitizeInventoryDocumentsSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("inventory-documents/search-metrics/:metricId")
  deleteInventoryDocumentsSearchMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
    @Query("docType") docType: DocType,
    @Query("productType") productType?: ProductCatalogProductType,
  ) {
    return this.deleteInventoryDocsSearchMetric.execute({
      userId: user.id,
      metricId,
      docType,
      productType,
    });
  }

  @Get("inventory-ledger/search-state")
  getInventoryLedgerSearchState(
    @CurrentUser() user: { id: string },
    @Query("productType") productType?: ProductCatalogProductType,
  ) {
    return this.getInventoryLedgerSearchStateUc.execute({ userId: user.id, productType });
  }

  @Post("inventory-ledger/search-metrics")
  saveInventoryLedgerSearchMetric(
    @Body() dto: HttpCreateInventoryLedgerSearchMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.saveInventoryLedgerSearchMetricUc.execute({
      userId: user.id,
      name: dto.name,
      productType: dto.productType,
      snapshot: sanitizeInventoryLedgerSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @Delete("inventory-ledger/search-metrics/:metricId")
  deleteInventoryLedgerSearchMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
    @Query("productType") productType?: ProductCatalogProductType,
  ) {
    return this.deleteInventoryLedgerSearchMetricUc.execute({
      userId: user.id,
      metricId,
      productType,
    });
  }

  @Get("inventory-ledger")
  listInventoryLedgerMovements(
    @Query() query: ListProductCatalogInventoryLedgerMovementsDto,
    @CurrentUser() user: { id: string },
  ) {
    const filters = this.parseInventoryLedgerFilters(query.filters);
    const snapshot = sanitizeInventoryLedgerSearchSnapshot({
      q: query.q,
      filters: filters ?? [],
    });

    return this.listLedgerMovements.execute({
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
      productType: query.productType,
      q: snapshot.q,
      filters: snapshot.filters,
      requestedBy: user?.id,
    });
  }

  @Get("inventory-documents")
  listInventoryDocuments(@Query() query: ListProductCatalogInventoryDocumentsDto, @CurrentUser() user: { id: string }) {
    const filters = this.parseInventoryDocumentFilters(query.filters);
    const snapshot = sanitizeInventoryDocumentsSearchSnapshot({
      q: query.q,
      filters: filters ?? [],
    });

    const mergeStrings = (...values: Array<string[] | undefined>) =>
      Array.from(new Set(values.flatMap((items) => items ?? []).map((item) => item?.trim()).filter(Boolean)));

    const warehouseIdsIn = mergeStrings(
      query.warehouseIdsIn,
      query.warehouseIds,
      query.warehouseId ? [query.warehouseId] : undefined,
      snapshot.filters.find((rule) => rule.field === "warehouseId")?.values,
    );

    const fromWarehouseIdsIn = mergeStrings(
      snapshot.filters.find((rule) => rule.field === "fromWarehouseId")?.values,
    );

    const toWarehouseIdsIn = mergeStrings(
      snapshot.filters.find((rule) => rule.field === "toWarehouseId")?.values,
    );

    const createdByIdsIn = mergeStrings(
      query.createdByIdsIn,
      query.createdById ? [query.createdById] : undefined,
      snapshot.filters.find((rule) => rule.field === "createdById")?.values,
    );

    const statuses = mergeStrings(
      query.statuses,
      query.status ? [query.status] : undefined,
      snapshot.filters.find((rule) => rule.field === "status")?.values,
    ) as any;

    return this.listDocuments.execute({
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
      warehouseIds: undefined,
      warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn : undefined,
      fromWarehouseIdsIn: fromWarehouseIdsIn.length ? fromWarehouseIdsIn : undefined,
      toWarehouseIdsIn: toWarehouseIdsIn.length ? toWarehouseIdsIn : undefined,
      warehouseIdsNotIn: query.warehouseIdsNotIn,
      docType: query.docType,
      productType: query.productType,
      status: undefined,
      statuses: statuses.length ? statuses : undefined,
      q: query.q,
      includeItems: query.includeItems === undefined ? undefined : query.includeItems === "true",
      createdById: query.createdById,
      createdByIdsIn: createdByIdsIn.length ? createdByIdsIn : undefined,
      createdByIdsNotIn: query.createdByIdsNotIn,
      filters: snapshot.filters,
      requestedBy: user?.id,
    });
  }

  @Get("inventory")
  listInventoryRows(
    @Query() query: ListProductCatalogInventoryDto,
    @CurrentUser() user: { id: string },
  ) {
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
      requestedBy: user?.id,
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

  private parseInventoryDocumentFilters(raw?: string): InventoryDocumentsSearchRule[] | undefined {
    if (!raw?.trim()) return undefined;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as InventoryDocumentsSearchRule[]) : undefined;
    } catch {
      return undefined;
    }
  }

  private parseInventoryLedgerFilters(raw?: string): InventoryLedgerSearchRule[] | undefined {
    if (!raw?.trim()) return undefined;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as InventoryLedgerSearchRule[]) : undefined;
    } catch {
      return undefined;
    }
  }
}
