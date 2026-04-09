import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "../../domain/ports/document-serie.repository";

@Injectable()
export class GetActiveProductCatalogDocumentSerieUseCase {
  constructor(
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly repo: ProductCatalogDocumentSerieRepository,
  ) {}

  async execute(input: { docType?: DocType; warehouseId: string; isActive?: boolean }) {
    const rows = await this.repo.findActiveFor(input);
    if (!rows.length) throw new NotFoundException("Serie de documento no encontrada");
    return rows[0];
  }
}
