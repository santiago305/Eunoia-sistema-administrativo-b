import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrder } from "../entities/purchase-order";
import { CurrencyType } from "../value-objects/currency-type";
import { PaymentFormType } from "../value-objects/payment-form-type";
import { PurchaseOrderStatus } from "../value-objects/po-status";
import { VoucherDocType } from "../value-objects/voucher-doc-type";
import { Money } from "src/shared/value-objets/money.vo";
import { PurchaseSearchRule } from "../../application/dtos/purchase-search/purchase-search-snapshot";

export const PURCHASE_ORDER = Symbol('PURCHASE_ORDER');

export interface PurchaseOrderListRecord {
    order: PurchaseOrder;
    supplierName?: string;
    supplierDocumentNumber?: string;
    warehouseName?: string;
    totalPaid: number;
}

export interface PurchaseOrderRepository{
    create(purchase: PurchaseOrder, tx?: TransactionContext):Promise<PurchaseOrder>;

    findById(poId: string, tx?: TransactionContext): Promise<PurchaseOrder | null>;
    listAllByStatus(status: PurchaseOrderStatus, tx?: TransactionContext): Promise<PurchaseOrder[]>;

    update(
        params: {
            poId: string;
            supplierId?: string;
            warehouseId?: string;
            documentType?: VoucherDocType;
            serie?: string;
            correlative?: number;
            currency?: CurrencyType;
            paymentForm?: PaymentFormType;
            creditDays?: number;
            numQuotas?: number;
            totalTaxed?: Money;
            totalExempted?: Money;
            totalIgv?: Money;
            purchaseValue?: Money;
            total?: Money;
            note?: string;
            status?: PurchaseOrderStatus;
            expectedAt?: Date;
            dateIssue?: Date;
            dateExpiration?: Date;
            createdAt?: Date;
            imageProdution?: string[];
        },
        tx?: TransactionContext,
    ): Promise<PurchaseOrder | null>;

    list(
        params: {
            filters?: PurchaseSearchRule[];
            q?: string;
            from?: Date;
            to?: Date;
            page?: number;
            limit?: number;
        },
        tx?: TransactionContext,
    ): Promise<{ items: PurchaseOrderListRecord[]; total: number; page: number; limit: number }>;

    setActive(poId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
