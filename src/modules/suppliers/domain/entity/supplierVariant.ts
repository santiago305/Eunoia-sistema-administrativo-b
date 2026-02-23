import { Money } from "src/modules/catalog/domain/value-object/money.vo";

export class SupplierVariant {
    constructor(
        public readonly supplierId: string,
        public readonly variantId: string,
        public readonly supplierSku?: string,
        public readonly lastCost?: Money,
        public readonly leadTimeDays?: number
    ) {}
}