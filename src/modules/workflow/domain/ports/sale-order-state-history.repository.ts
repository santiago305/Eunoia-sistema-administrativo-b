import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrderStateHistory } from "../entities/sale-order-state-history";

export const SALE_ORDER_STATE_HISTORY_REPOSITORY = Symbol("SALE_ORDER_STATE_HISTORY_REPOSITORY");

export interface SaleOrderStateHistoryRepository {
  append(history: SaleOrderStateHistory, tx: TransactionContext): Promise<void>;
  listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderStateHistory[]>;
}
