import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { LedgerEntry } from "../entities/ledger-entry";

export const LEDGER_REPOSITORY = Symbol("LEDGER_REPOSITORY");

export interface LedgerRepository {
  append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void>;
  getBalances(
    params: { warehouseId?: string; stockItemId?: string; locationId?: string; from?: Date; to?: Date; docId?: string },
    tx?: TransactionContext,
  ): Promise<{ entradaRango: number; salidaRango: number; balanceRango: number; balanceInicial: number; balanceFinal: number; balanceTotal: number }>;
  getDailyTotals(
    params: { warehouseId?: string; stockItemId?: string; locationId?: string; from?: Date; to?: Date; docId?: string },
    tx?: TransactionContext,
  ): Promise<{ day: string; entrada: number; salida: number; balance: number }[]>;
  list(
    params: { warehouseId?: string; stockItemId?: string; locationId?: string; from?: Date; to?: Date; docId?: string; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: LedgerEntry[]; total: number; page: number; limit: number }>;
  updateWasteByDocItem(params: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean>;
}
