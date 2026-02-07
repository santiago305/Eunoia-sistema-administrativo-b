import DocumentSerie from "../entities/document-serie";
import { DocType } from "../value-objects/doc-type";
import { TransactionContext } from "./unit-of-work.port";

export const SERIES_REPOSITORY = Symbol('SERIES_REPOSITORY');

export interface DocumentSeriesRepository {
  findActiveFor(
    params: { docType: DocType; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<DocumentSerie | null>;

  reserveNextNumber(
    serieId: string,
    tx: TransactionContext,
  ): Promise<number>;

  findById(
    serieId: string,
    tx?: TransactionContext,
  ): Promise<DocumentSerie | null>;

  creatDocumentSerie(
    documentSerie: DocumentSerie, tx?:TransactionContext
  ): Promise<DocumentSerie>
  
}
