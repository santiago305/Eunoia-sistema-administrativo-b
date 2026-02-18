import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { Unit } from "src/modules/catalog/domain/entity/unit";

export const UNIT_REPOSITORY = Symbol("UNIT_REPOSITORY");
export interface UnitRepository {
    list(tx?:TransactionContext):Promise<Unit[]>;
}
