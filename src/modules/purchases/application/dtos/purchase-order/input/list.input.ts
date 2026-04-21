import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseSearchRule } from "../../purchase-search/purchase-search-snapshot";

export interface ListPurchaseOrdersInput {
  status?: PurchaseOrderStatus;
  statuses?: PurchaseOrderStatus[];
  supplierId?: string;
  supplierIds?: string[];
  warehouseId?: string;
  warehouseIds?: string[];
  documentType?: VoucherDocType;
  documentTypes?: VoucherDocType[];
  paymentForms?: PaymentFormType[];
  number?: string;
  q?: string;
  filters?: PurchaseSearchRule[];
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  requestedBy?: string;
}
