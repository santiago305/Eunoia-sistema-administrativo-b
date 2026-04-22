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
    docType?: DocType;
    productType?: ProductCatalogProductType;
    status?: DocStatus;
    q?: string;
  }) {
    const from = new Date(params.from);
    const toExclusive = new Date(params.to);

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
