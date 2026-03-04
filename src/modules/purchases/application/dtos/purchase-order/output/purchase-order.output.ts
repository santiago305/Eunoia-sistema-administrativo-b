import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export interface PurchaseOrderOutput {
  poId: string;
  supplierId: string;
  warehouseId: string;
  documentType?: VoucherDocType;
  serie?: string;
  correlative?: number;
  currency?: CurrencyType;
  paymentForm?: PaymentFormType;
  creditDays: number;
  numQuotas: number;
  totalTaxed: number;
  totalExempted: number;
  totalIgv: number;
  purchaseValue: number;
  total?: number;
  note?: string;
  status: PurchaseOrderStatus;
  isActive: boolean;
  expectedAt?: Date;
  dateIssue?: Date;
  dateExpiration?: Date;
  createdAt?: Date;
}
