import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
  ProductCatalogInventoryDocumentRepository,
} from "../../domain/ports/inventory-document.repository";

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseFrom = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = isDateOnly(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseToExclusive = (value?: string): Date | undefined => {
  if (!value) return undefined;

  if (isDateOnly(value)) {
    const start = new Date(`${value}T00:00:00`);
    if (Number.isNaN(start.getTime())) return undefined;
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    return next;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Date(date.getTime() + 1);
};

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
    docType?: DocType;
    productType?: ProductCatalogProductType;
    status?: DocStatus;
    q?: string;
  }) {
    const from = parseFrom(params.from);
    const toExclusive = parseToExclusive(params.to);

    if (from && toExclusive && from.getTime() >= toExclusive.getTime()) {
      throw new BadRequestException("Rango de fechas invalido");
    }

    return this.repo.list({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      from,
      toExclusive,
      docType: params.docType,
      productType: params.productType,
      status: params.status,
      warehouseIds: params.warehouseIds?.length ? params.warehouseIds : undefined,
      q: params.q,
    });
  }
}
