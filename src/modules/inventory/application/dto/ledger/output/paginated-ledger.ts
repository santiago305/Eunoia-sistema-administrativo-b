import { LedgerEntryOutput } from "./ledger-out";

export interface PaginatedLedgerResult {
  items: LedgerEntryOutput[];
  total: number;
  page: number;
  limit: number;
  balances: {
    entradaRango: number;
    salidaRango: number;
    balanceRango: number;
    balanceInicial: number;
    balanceFinal: number;
    balanceTotal: number;
  };
}
