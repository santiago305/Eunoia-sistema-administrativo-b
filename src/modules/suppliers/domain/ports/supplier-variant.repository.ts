import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SupplierVariant } from "../entity/supplierVariant";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";

export const SUPPLIER_VARIANT_REPOSITORY = Symbol('SUPPLIER_VARIANT_REPOSITORY');

export interface SupplierVariantRepository {
    findById(
        supplierId: string,
        variantId: string,
        tx?: TransactionContext,
    ): Promise<SupplierVariant | null>;

    create(variant: SupplierVariant, tx?: TransactionContext): Promise<SupplierVariant | null>;

    update(
        params: {
            supplierId: string;
            variantId: string;
            supplierSku?: string;
            lastCost?: Money;
            leadTimeDays?: number;
        },
        tx?: TransactionContext,
    ): Promise<SupplierVariant | null>;

    list(
        params: {
            supplierId?: string;
            variantId?: string;
            supplierSku?: string;
            page?: number;
            limit?: number;
        },
        tx?: TransactionContext,
    ): Promise<{ items: SupplierVariant[]; total: number }>;
}
