import { LedgerEntry } from '../entities/ledger-entry';
import { TransactionContext } from './unit-of-work.port';

export const LEDGER_REPOSITORY = Symbol('LEDGER_REPOSITORY');

export interface LedgerRepository {
  append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void>;
  list(
    params: {
      warehouseId?: string;
      variantId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<LedgerEntry[]>;
}
