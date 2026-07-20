import { Inject, Injectable } from "@nestjs/common";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "../../domain/ports/document-serie.repository";
import { ProductCatalogDocumentSerie } from "../../domain/entities/document-serie";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";

@Injectable()
export class CreateProductCatalogDocumentSerieUseCase {
  constructor(
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly repo: ProductCatalogDocumentSerieRepository,
  ) {}

  async execute(input: {
    code: string;
    name: string;
    docType: DocType;
    warehouseId: string;
    nextNumber?: number;
    padding?: number;
    separator?: string;
    isActive?: boolean;
  }, tx?: TransactionContext) {
    const serie = ProductCatalogDocumentSerie.create(input);
    return this.repo.create(serie, tx);
  }
}
