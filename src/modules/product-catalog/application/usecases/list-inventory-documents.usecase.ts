import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
  ProductCatalogInventoryDocumentRepository,
} from "../../domain/ports/inventory-document.repository";
@Injectable()
export class ListProductCatalogInventoryDocuments {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly repo: ProductCatalogInventoryDocumentRepository,
  ) {}

  execute(params: {
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
    q?: string;
    includeItems?: boolean;
    createdById?: string;
    createdByIdsIn?: string[];
    createdByIdsNotIn?: string[];
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

    return this.repo.list({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      from,
      toExclusive,
      docType: params.docType,
      productType: params.productType,
      status: params.status,
      warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn : undefined,
      warehouseIdsNotIn: params.warehouseIdsNotIn?.length ? params.warehouseIdsNotIn : undefined,
      q: params.q,
      includeItems,
      createdByIdsIn: createdByIdsIn.length ? createdByIdsIn : undefined,
      createdByIdsNotIn: params.createdByIdsNotIn?.length ? params.createdByIdsNotIn : undefined,
    });
  }
}
