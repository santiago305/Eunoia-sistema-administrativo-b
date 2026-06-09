import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrdersStates } from "../entities/sale-order-states";

export const SALE_ORDER_STATES_REPOSITORY = Symbol("SALE_ORDER_STATES_REPOSITORY");

export interface SaleOrderStatesRepository {
  create(state: SaleOrdersStates, tx?: TransactionContext): Promise<SaleOrdersStates>;
  findById(saleOrderStateId: string, tx?: TransactionContext): Promise<SaleOrdersStates | null>;
  list(tx?: TransactionContext): Promise<SaleOrdersStates[]>;
  update(state: SaleOrdersStates, tx?: TransactionContext): Promise<SaleOrdersStates>;
}
