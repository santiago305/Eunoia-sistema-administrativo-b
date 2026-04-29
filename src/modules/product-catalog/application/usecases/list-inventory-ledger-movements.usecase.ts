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
import {
  InventoryLedgerSearchFields,
  InventoryLedgerSearchOperators,
} from "../dtos/inventory-ledger-search/inventory-ledger-search-snapshot";

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
    const from = this.parseDate(params.from, "from");
    const toExclusive = this.parseDate(params.to, "to");

    if (from && toExclusive && from.getTime() >= toExclusive.getTime()) {
      throw new BadRequestException("Rango de fechas inválido");
    }

    const snapshot = sanitizeInventoryLedgerSearchSnapshot({
      q: params.q,
      filters: params.filters ?? [],
    });

    const warehouseIdsIn = this.getInValues(
      snapshot.filters,
      InventoryLedgerSearchFields.WAREHOUSE_ID,
    );

    const userIdsIn = this.getInValues(
      snapshot.filters,
      InventoryLedgerSearchFields.USER_ID,
    );

    const directionIn = this.getInValues(
      snapshot.filters,
      InventoryLedgerSearchFields.DIRECTION,
    );

    const skuIdsIn = this.getInValues(
      snapshot.filters,
      InventoryLedgerSearchFields.SKU,
    );

    const skuQuery = this.getTextValue(
      snapshot.filters,
      InventoryLedgerSearchFields.SKU,
    );

    const response = await this.repo.listMovementsPaged({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      productType: params.productType,
      from,
      toExclusive,
      warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn : undefined,
      skuIdsIn: skuIdsIn.length ? skuIdsIn : undefined,
      userIdsIn: userIdsIn.length ? userIdsIn : undefined,
      directionIn: directionIn.length ? (directionIn as any) : undefined,
      skuQuery,
      q: snapshot.q,
    });

    if (params.requestedBy && hasInventoryLedgerSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: params.requestedBy,
        tableKey: resolveInventoryLedgerTableKey({
          productType: params.productType,
        }),
        snapshot,
      });
    }

    return response;
  }

  private parseDate(value: string | undefined, fieldName: string): Date | undefined {
    if (!value) return undefined;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Fecha '${fieldName}' inválida`);
    }

    return date;
  }

  private getInValues(
    filters: InventoryLedgerSearchRule[],
    field: InventoryLedgerSearchRule["field"],
  ): string[] {
    const rule = filters.find(
      (item) =>
        item.field === field &&
        item.operator === InventoryLedgerSearchOperators.IN,
    );

    if (!rule || !("values" in rule) || !Array.isArray(rule.values)) {
      return [];
    }

    return rule.values.map(String).filter(Boolean);
  }

  private getTextValue(
    filters: InventoryLedgerSearchRule[],
    field: InventoryLedgerSearchRule["field"],
  ): string | undefined {
    const rule = filters.find((item) => item.field === field);

    if (!rule || !("value" in rule)) {
      return undefined;
    }

    const value = String(rule.value).trim();

    return value || undefined;
  }
}
