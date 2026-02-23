import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Unit } from "src/modules/catalog/domain/entity/unit";

export const UNIT_REPOSITORY = Symbol("UNIT_REPOSITORY");
export interface UnitRepository {
    list(tx?:TransactionContext):Promise<Unit[]>;
    getById(id?:string, tx?:TransactionContext):Promise<Unit>;
}
