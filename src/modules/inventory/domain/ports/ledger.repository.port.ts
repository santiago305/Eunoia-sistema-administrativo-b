import { LedgerEntry } from '../entities/ledger-entry';
import { TransactionContext } from './unit-of-work.port';

export const LEDGER_REPOSITORY = Symbol('LEDGER_REPOSITORY');

export interface LedgerRepository {
  append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void>;
  list(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?:string;
      from?: Date;
      to?: Date;
      docId?: string;
      page?:number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: LedgerEntry[];
    total: number;
    page: number;
    limit: number;
  }>;
}

