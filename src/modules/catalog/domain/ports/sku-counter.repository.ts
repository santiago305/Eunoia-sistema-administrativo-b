import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { SkuCounter } from "../entity/sku-counter";

export const SKU_COUNTER_REPOSITORY = Symbol("SKU_COUNTER_REPOSITORY");

export interface SkuCounterRepository {
    create(counter: SkuCounter, tx?: TransactionContext): Promise<void>;
    update(counter: SkuCounter, tx?: TransactionContext): Promise<void>;
    findLast(tx?: TransactionContext): Promise<SkuCounter | null>;
    reserveNext(tx: TransactionContext): Promise<number>;
}
