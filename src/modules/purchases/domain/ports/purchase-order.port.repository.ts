import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrder } from "../entities/purchase-order";
import { CurrencyType } from "../value-objects/currency-type";
import { PaymentFormType } from "../value-objects/payment-form-type";
import { PurchaseOrderStatus } from "../value-objects/po-status";
import { VoucherDocType } from "../value-objects/voucher-doc-type";
import { Money } from "src/shared/value-objets/money.vo";

export const PURCHASE_ORDER = Symbol('PURCHASE_ORDER');
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
        },
        tx?: TransactionContext,
    ): Promise<PurchaseOrder | null>;

    list(
        params: {
            status?: PurchaseOrderStatus;
            supplierId?: string;
            warehouseId?: string;
            documentType?: VoucherDocType;
            number?: string;
            from?: Date;
            to?: Date;
            page?: number;
            limit?: number;
        },
        tx?: TransactionContext,
    ): Promise<{ items: PurchaseOrder[]; total: number; page: number; limit: number }>;

    setActive(poId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}
