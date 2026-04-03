import { Money } from "src/shared/value-objets/money.vo";

export class SupplierVariant {
    constructor(
        public readonly supplierId: string,
        public readonly variantId: string,
        public readonly supplierSku?: string,
        public readonly lastCost?: Money,
        public readonly leadTimeDays?: number
    ) {}
}