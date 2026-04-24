import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "../../domain/ports/inventory-ledger.repository";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { InventoryLedgerSearchRule } from "../dtos/inventory-ledger-search/inventory-ledger-search-snapshot";
import {
  hasInventoryLedgerSearchCriteria,
  resolveInventoryLedgerTableKey,
  sanitizeInventoryLedgerSearchSnapshot,
} from "../support/inventory-ledger-search.utils";
import { InventoryLedgerSearchFields, InventoryLedgerSearchOperators } from "../dtos/inventory-ledger-search/inventory-ledger-search-snapshot";

@Injectable()
export class ListProductCatalogInventoryLedgerMovements {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly repo: ProductCatalogInventoryLedgerRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(params: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    productType?: ProductCatalogProductType;
    q?: string;
    filters?: InventoryLedgerSearchRule[];
    requestedBy?: string;
  }) {
    const from = params.from ? new Date(params.from) : undefined;
    const toExclusive = params.to ? new Date(params.to) : undefined;

    if (from && Number.isNaN(from.getTime())) throw new BadRequestException("Fecha 'from' inválida");
    if (toExclusive && Number.isNaN(toExclusive.getTime())) throw new BadRequestException("Fecha 'to' inválida");
    if (from && toExclusive && from.getTime() >= toExclusive.getTime()) throw new BadRequestException("Rango de fechas invalido");

    const snapshot = sanitizeInventoryLedgerSearchSnapshot({
      q: params.q,
      filters: params.filters ?? [],
    });

    const warehouseIdsIn =
      snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.WAREHOUSE_ID)?.operator === InventoryLedgerSearchOperators.IN
        ? (snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.WAREHOUSE_ID) as any).values
        : [];

    const userIdsIn =
      snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.USER_ID)?.operator === InventoryLedgerSearchOperators.IN
        ? (snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.USER_ID) as any).values
        : [];

    const directionIn =
      snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.DIRECTION)?.operator === InventoryLedgerSearchOperators.IN
        ? (snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.DIRECTION) as any).values
        : [];

    const skuRule = snapshot.filters.find((rule) => rule.field === InventoryLedgerSearchFields.SKU) as any;
    const skuQuery = skuRule?.value ? String(skuRule.value) : undefined;

    const response = await this.repo.listMovementsPaged({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      productType: params.productType,
      from,
      toExclusive,
      warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn : undefined,
      userIdsIn: userIdsIn.length ? userIdsIn : undefined,
      directionIn: directionIn.length ? directionIn : undefined,
      skuQuery: skuQuery?.trim() || undefined,
      q: snapshot.q,
    });

    if (params.requestedBy && hasInventoryLedgerSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: params.requestedBy,
        tableKey: resolveInventoryLedgerTableKey({ productType: params.productType }),
        snapshot,
      });
    }

    return response;
  }
}

