import { Injectable } from "@nestjs/common";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "./templates/invoice-pdf";
import { PurchaseOrderPdf } from "./templates/purchase-order-pdf";
import { ProductionOrderPdf } from "./templates/production-order-pdf";
import { InventoryDocumentPdf } from "./templates/inventory-document-pdf";
import {
  InvoicePdfData,
  PdfRendererPort,
  PurchaseOrderPdfData,
  ProductionOrderPdfData,
  InventoryDocumentPdfData,
} from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

@Injectable()
export class ReactPdfRenderer implements PdfRendererPort {
  async renderInvoice(data: InvoicePdfData): Promise<Buffer> {
    return renderToBuffer(InvoicePdf({ data }));
  }

  async renderPurchaseOrder(data: PurchaseOrderPdfData): Promise<Buffer> {
    return renderToBuffer(PurchaseOrderPdf({ data }));
  }

  async renderProductionOrder(data: ProductionOrderPdfData): Promise<Buffer> {
    return renderToBuffer(ProductionOrderPdf({ data }));
  }

  async renderInventoryDocument(data: InventoryDocumentPdfData): Promise<Buffer> {
    return renderToBuffer(InventoryDocumentPdf({ data }));
  }
}


