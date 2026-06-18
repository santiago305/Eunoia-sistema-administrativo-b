import { ClientType } from "src/modules/clients/domain/object-values/client-type";

export type SaleOrderStatisticsOutput = {
  byWorkflow: Array<{ id: string | null; label: string; count: number }>;
  byState: Array<{ id: string | null; label: string; color: string | null; count: number }>;
  byClientType: Array<{ type: ClientType; label: string; count: number }>;
  byBankAccount: Array<{
    id: string | null;
    label: string;
    number: string | null;
    payments: number;
    collected: number;
  }>;
  totals: { orders: number; total: number; collected: number; pending: number; deliveryCostSum:number };
};
