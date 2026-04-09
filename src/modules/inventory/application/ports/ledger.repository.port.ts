import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { LedgerEntry } from '../../domain/entities/ledger-entry';

export const LEDGER_REPOSITORY = Symbol('LEDGER_REPOSITORY');

export interface LedgerRepository {
  append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void>;
  getBalances(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<{
    entradaRango: number;
    salidaRango: number;
    balanceRango: number;
    balanceInicial: number;
    balanceFinal: number;
    balanceTotal: number;
  }>;
  getDailyTotals(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<
    {
      day: string;
      entrada: number;
      salida: number;
      balance: number;
    }[]
  >;
  getSalesDailyTotals(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
      month?: string;
    },
    tx?: TransactionContext,
  ): Promise<
    {
      day: string;
      salida: number;
    }[]
  >;
  getSalesMonthlyTotals(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<
    {
      month: string;
      salida: number;
    }[]
  >;
  getSalesWeekdayTotals(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<
    {
      weekday: number;
      salida: number;
    }[]
  >;
  getSalesWarehouseTotals(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<
    {
      warehouseId: string;
      warehouseName?: string | null;
      salida: number;
    }[]
  >;
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
  updateWasteByDocItem(
    params: { docItemId: string; wasteQty: number },
    tx?: TransactionContext,
  ): Promise<boolean>;
}

