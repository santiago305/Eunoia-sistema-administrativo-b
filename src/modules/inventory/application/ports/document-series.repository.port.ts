import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import DocumentSerie from "../../domain/entities/document-serie";
import { DocType } from "../../domain/value-objects/doc-type";


export const SERIES_REPOSITORY = Symbol('SERIES_REPOSITORY');

export interface DocumentSeriesRepository {
  findActiveFor(
    params: { docType?: DocType; isActive?:boolean; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<DocumentSerie[]>;

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
  
  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
