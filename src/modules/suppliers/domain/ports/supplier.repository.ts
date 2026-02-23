import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Supplier } from "../entity/supplier";
import { SupplierDocType } from "../object-values/supplier-doc-type";

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');

export interface SupplierRepository {
    findById(supplierId: string, tx?: TransactionContext): Promise<Supplier | null>;
    findByDocument(
        documentType: SupplierDocType,
        documentNumber: string,
        tx?: TransactionContext,
    ): Promise<Supplier | null>;

    create(supplier: Supplier, tx?: TransactionContext): Promise<Supplier>;

    update(
        params: {
            supplierId: string;
            documentType?: SupplierDocType;
            documentNumber?: string;
            name?: string;
            lastName?: string;
            tradeName?: string;
            address?: string;
            phone?: string;
            email?: string;
            note?: string;
            leadTimeDays?: number;
            isActive?: boolean;
            createdAt?: Date;
            updatedAt?: Date;
        },
        tx?: TransactionContext,
    ): Promise<Supplier>;

    list(
        params: {
            documentType?: SupplierDocType;
            documentNumber?: string;
            name?: string;
            lastName?: string;
            tradeName?: string;
            phone?: string;
            email?: string;
            q?: string;
            isActive?: boolean;
            page?: number;
            limit?: number;
        },
        tx?: TransactionContext,
    ): Promise<{ items: Supplier[]; total: number }>;

    setActive(supplierId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
