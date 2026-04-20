import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export interface PurchaseSearchFilters {
  supplierIds: string[];
  warehouseIds: string[];
  statuses: PurchaseOrderStatus[];
  documentTypes: VoucherDocType[];
  paymentForms: PaymentFormType[];
}

export interface PurchaseSearchSnapshot {
  q?: string;
  filters: PurchaseSearchFilters;
}
