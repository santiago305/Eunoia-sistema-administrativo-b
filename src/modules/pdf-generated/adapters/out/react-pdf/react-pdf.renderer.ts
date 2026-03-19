import { Injectable } from "@nestjs/common";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "./templates/invoice-pdf";
import { PurchaseOrderPdf } from "./templates/purchase-order-pdf";
import { InvoicePdfData, PdfRendererPort, PurchaseOrderPdfData } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

@Injectable()
export class ReactPdfRenderer implements PdfRendererPort {
  async renderInvoice(data: InvoicePdfData): Promise<Buffer> {
    return renderToBuffer(InvoicePdf({ data }));
  }

  async renderPurchaseOrder(data: PurchaseOrderPdfData): Promise<Buffer> {
    return renderToBuffer(PurchaseOrderPdf({ data }));
  }
}
