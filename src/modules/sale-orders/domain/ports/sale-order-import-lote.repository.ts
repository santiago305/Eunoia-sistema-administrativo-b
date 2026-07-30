import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";

export const SALE_ORDER_IMPORT_LOTE_REPOSITORY = Symbol("SALE_ORDER_IMPORT_LOTE_REPOSITORY");

export type SaleOrderImportLoteWrite = {
  lote: number;
  createdBy: string;
  isActive?: boolean;
};

export type SaleOrderImportLoteRecord = {
  id: string;
  lote: number;
  createdAt: Date;
  createdBy: string;
  createdByName: string | null;
  createdByEmail: string | null;
  isActive: boolean;
};

export type SaleOrderImportLoteAuditRecord = {
  id: string;
  loteId: string;
  createdAt: Date;
  executedBy: string;
  executedByName: string | null;
  executedByEmail: string | null;
  actionExecution: "delete" | "restore";
};

export interface SaleOrderImportLoteRepository {
  reserveNextLote(tx: TransactionContext): Promise<number>;
  create(input: SaleOrderImportLoteWrite, tx?: TransactionContext): Promise<SaleOrderImportLoteRecord>;
  findByIdForUpdate(id: string, tx?: TransactionContext): Promise<SaleOrderImportLoteRecord | null>;
  list(tx?: TransactionContext): Promise<SaleOrderImportLoteRecord[]>;
  setActive(input: { id: string; isActive: boolean }, tx?: TransactionContext): Promise<SaleOrderImportLoteRecord>;
  createAudit(input: { loteId: string; executedBy: string; actionExecution: "delete" | "restore" }, tx?: TransactionContext): Promise<void>;
  listAudit(loteId: string, tx?: TransactionContext): Promise<SaleOrderImportLoteAuditRecord[]>;
}
