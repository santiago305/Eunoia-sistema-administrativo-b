import { InvoicePdfData } from "../interfaces/invoice-data";
import { PurchaseOrderPdfData } from "../interfaces/purchase-data";

export { InvoicePdfData } from "../interfaces/invoice-data";
export { PurchaseOrderPdfData } from "../interfaces/purchase-data";

export const PDF_RENDERER = Symbol("PDF_RENDERER");

export interface PdfRendererPort {
  renderInvoice(data: InvoicePdfData): Promise<Buffer>;
  renderPurchaseOrder(data: PurchaseOrderPdfData): Promise<Buffer>;
}
