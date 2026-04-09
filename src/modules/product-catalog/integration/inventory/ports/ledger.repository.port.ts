import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { LedgerEntry } from "../entities/ledger-entry";

export const LEDGER_REPOSITORY = Symbol("LEDGER_REPOSITORY");

export interface LedgerRepository {
  append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void>;
  updateWasteByDocItem(params: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean>;
  getBalances(): Promise<{ entradaRango: number; salidaRango: number; balanceRango: number; balanceInicial: number; balanceFinal: number; balanceTotal: number }>;
  getDailyTotals(): Promise<{ day: string; entrada: number; salida: number; balance: number }[]>;
  list(): Promise<{ items: LedgerEntry[]; total: number; page: number; limit: number }>;
}
