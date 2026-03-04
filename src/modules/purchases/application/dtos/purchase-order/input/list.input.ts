import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export interface ListPurchaseOrdersInput {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
  documentType?: VoucherDocType;
  serie?: string;
  correlative?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
