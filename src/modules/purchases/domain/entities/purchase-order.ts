import { Money } from "src/shared/value-objets/money.vo";
import { CurrencyType } from "../value-objects/currency-type";
import { PaymentFormType } from "../value-objects/payment-form-type";
import { PurchaseOrderStatus } from "../value-objects/po-status";
import { PurchasePaymentStatus } from "../value-objects/purchase-payment-status";
import { PurchaseType } from "../value-objects/purchase-type";
import { ReceptionStatus } from "../value-objects/reception-status";
import { VoucherDocType } from "../value-objects/voucher-doc-type";

export class PurchaseOrder {
  constructor(
    public readonly poId: string,
    public readonly supplierId: string,
    public readonly warehouseId: string | undefined,
    public readonly creditDays: number = 0,
    public readonly numQuotas: number = 0,
    public readonly totalTaxed: Money,
    public readonly totalExempted: Money,
    public readonly totalIgv: Money,
    public readonly purchaseValue: Money,
    public readonly total: Money,
    public readonly documentType?: VoucherDocType,
    public readonly serie?: string,
    public readonly correlative?: number,
    public readonly currency?: CurrencyType,
    public readonly paymentForm?: PaymentFormType,
    public readonly note?: string,
    public readonly status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT,
    public readonly purchaseType: PurchaseType = PurchaseType.INVENTORY,
    public readonly receptionStatus: ReceptionStatus = ReceptionStatus.PENDING,
    public readonly paymentStatus: PurchasePaymentStatus = PurchasePaymentStatus.PENDING,
    public readonly requestedByUserId?: string,
    public readonly approvedByUserId?: string,
    public readonly approvedAt?: Date,
    public readonly rejectedByUserId?: string,
    public readonly rejectedAt?: Date,
    public readonly rejectionReason?: string,
    public readonly isRecurringSource: boolean = false,
    public readonly recurringTemplateId?: string,
    public readonly requiresReceipt: boolean = true,
    public readonly requiresStockEntry: boolean = true,
    public readonly requiresAssetCreation: boolean = false,
    public readonly isActive: boolean = true,
    public readonly expectedAt?: Date,
    public readonly dateIssue?: Date,
    public readonly dateExpiration?: Date,
    public readonly createdAt?: Date,
    public readonly createdBy?: string,
    public readonly imageProdution: string[] = [],
  ) {}
}
