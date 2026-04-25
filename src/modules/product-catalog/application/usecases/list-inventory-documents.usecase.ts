import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
  ProductCatalogInventoryDocumentRepository,
} from "../../domain/ports/inventory-document.repository";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { InventoryDocumentsSearchRule } from "../dtos/inventory-documents-search/inventory-documents-search-snapshot";
import {
  hasInventoryDocumentsSearchCriteria,
  resolveInventoryDocumentsTableKey,
  sanitizeInventoryDocumentsSearchSnapshot,
} from "../support/inventory-documents-search.utils";
@Injectable()
export class ListProductCatalogInventoryDocuments {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly repo: ProductCatalogInventoryDocumentRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(params: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    warehouseIds?: string[];
    warehouseIdsIn?: string[];
    warehouseIdsNotIn?: string[];
    docType?: DocType;
    productType?: ProductCatalogProductType;
    status?: DocStatus;
    statuses?: DocStatus[];
    fromWarehouseIdsIn?: string[];
    toWarehouseIdsIn?: string[];
    q?: string;
    includeItems?: boolean;
    createdById?: string;
    createdByIdsIn?: string[];
    createdByIdsNotIn?: string[];
    filters?: InventoryDocumentsSearchRule[];
    requestedBy?: string;
  }) {
    const from = params.from ? new Date(params.from) : undefined;
    const toExclusive = params.to ? new Date(params.to) : undefined;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException("Fecha 'from' inválida");
    }
    if (toExclusive && Number.isNaN(toExclusive.getTime())) {
      throw new BadRequestException("Fecha 'to' inválida");
    }

    if (from && toExclusive && from.getTime() >= toExclusive.getTime()) {
      throw new BadRequestException("Rango de fechas invalido");
    }

    const includeItems = params.includeItems ?? false;
    const warehouseIdsIn = Array.from(new Set([...(params.warehouseIdsIn ?? []), ...(params.warehouseIds ?? [])]));
    const createdByIdsIn = Array.from(
      new Set([...(params.createdByIdsIn ?? []), ...(params.createdById ? [params.createdById] : [])]),
    );

    const snapshot = sanitizeInventoryDocumentsSearchSnapshot({
      q: params.q,
      filters: params.filters ?? [],
    });

    const response = await this.repo.list({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      from,
      toExclusive,
      docType: params.docType,
      productType: params.productType,
      status: params.status,
      statuses: params.statuses,
      fromWarehouseIdsIn: params.fromWarehouseIdsIn?.length ? params.fromWarehouseIdsIn : undefined,
      toWarehouseIdsIn: params.toWarehouseIdsIn?.length ? params.toWarehouseIdsIn : undefined,
      warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn : undefined,
      warehouseIdsNotIn: params.warehouseIdsNotIn?.length ? params.warehouseIdsNotIn : undefined,
      q: snapshot.q,
      includeItems,
      createdByIdsIn: createdByIdsIn.length ? createdByIdsIn : undefined,
      createdByIdsNotIn: params.createdByIdsNotIn?.length ? params.createdByIdsNotIn : undefined,
    });

    if (params.requestedBy && params.docType && hasInventoryDocumentsSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: params.requestedBy,
        tableKey: resolveInventoryDocumentsTableKey({
          docType: params.docType,
          productType: params.productType,
        }),
        snapshot,
      });
    }

    return response;
  }
}
