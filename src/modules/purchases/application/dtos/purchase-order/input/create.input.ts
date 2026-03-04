import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { AddPurchaseOrderItemInput } from "../../purchase-order-item/input/add.input";
import { CreatePaymentInput } from "src/modules/payments/application/dtos/payment/input/create.input";
import { CreateCreditQuotaInput } from "src/modules/payments/application/dtos/credit-quota/input/create.input";

export interface CreatePurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  documentType?: VoucherDocType;
  serie?: string;
  correlative?: number;
  currency?: CurrencyType;
  paymentForm?: PaymentFormType;
  creditDays?: number;
  numQuotas?: number;
  totalTaxed?: number;
  totalExempted?: number;
  totalIgv?: number;
  purchaseValue?: number;
  total?: number;
  note?: string;
  status?: PurchaseOrderStatus;
  expectedAt?: string;
  dateIssue?: string;
  dateExpiration?: string;
  isActive?: boolean;
  items?: AddPurchaseOrderItemInput[];
  payments?: CreatePaymentInput[];
  quotas?: CreateCreditQuotaInput[];
}
