import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogDocumentSerie } from "../entities/document-serie";

export const PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY = Symbol("PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY");

export interface ProductCatalogDocumentSerieRepository {
  findActiveFor(
    params: { docType?: DocType; isActive?: boolean; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<ProductCatalogDocumentSerie[]>;

  reserveNextNumber(serieId: string, tx: TransactionContext): Promise<number>;
  findById(serieId: string, tx?: TransactionContext): Promise<ProductCatalogDocumentSerie | null>;
  create(documentSerie: ProductCatalogDocumentSerie, tx?: TransactionContext): Promise<ProductCatalogDocumentSerie>;
  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
