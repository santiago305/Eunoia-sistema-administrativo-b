import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { CurrencyType } from "../value-objects/currency-type";
import { PaymentFormType } from "../value-objects/payment-form-type";
import { PurchaseOrderStatus } from "../value-objects/po-status";
import { VoucherDocType } from "../value-objects/voucher-doc-type";

export class PurchaseOrder {
  constructor(
    public readonly poId: string,
    public readonly supplierId: string,
    public readonly warehouseId: string,
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
    public readonly isActive: boolean = true,
    public readonly expectedAt?: Date,
    public readonly dateIssue?: Date,
    public readonly dateExpiration?: Date,
    public readonly createdAt?: Date,
  ) {}
}
