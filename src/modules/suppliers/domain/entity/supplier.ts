import { SupplierDocType } from "../object-values/supplier-doc-type";

export class Supplier {
    constructor(
        public readonly supplierId: string,
        public readonly documentType: SupplierDocType,
        public readonly documentNumber: string,
        public readonly name?: string,
        public readonly lastName?: string,
        public readonly tradeName?: string,
        public readonly address?: string,
        public readonly phone?: string,
        public readonly email?: string,
        public readonly note?:string,
        public readonly leadTimeDays?: number,
        public readonly isActive: boolean = true,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date,

    ){}
}
