import { Injectable } from "@nestjs/common";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "./templates/invoice-pdf";
import { PurchaseOrderPdf } from "./templates/purchase-order-pdf";
import { ProductionOrderPdf } from "./templates/production-order-pdf";
import { InventoryDocumentPdf } from "./templates/inventory-document-pdf";
import { SaleOrderPdf } from "./templates/sale-order-pdf";
import {
  InvoicePdfData,
  PdfRendererPort,
  PurchaseOrderPdfData,
  ProductionOrderPdfData,
  InventoryDocumentPdfData,
  SaleOrderPdfData,
} from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

type PdfDocumentElement = Parameters<typeof renderToBuffer>[0];

const asPdfDocument = (element: unknown): PdfDocumentElement =>
  element as PdfDocumentElement;

@Injectable()
export class ReactPdfRenderer implements PdfRendererPort {
  async renderInvoice(data: InvoicePdfData): Promise<Buffer> {
    return renderToBuffer(asPdfDocument(InvoicePdf({ data })));
  }

  async renderPurchaseOrder(data: PurchaseOrderPdfData): Promise<Buffer> {
    return renderToBuffer(asPdfDocument(PurchaseOrderPdf({ data })));
  }

  async renderProductionOrder(data: ProductionOrderPdfData): Promise<Buffer> {
    return renderToBuffer(asPdfDocument(ProductionOrderPdf({ data })));
  }

  async renderInventoryDocument(data: InventoryDocumentPdfData): Promise<Buffer> {
    return renderToBuffer(asPdfDocument(InventoryDocumentPdf({ data })));
  }

  async renderSaleOrder(data: SaleOrderPdfData): Promise<Buffer> {
    return renderToBuffer(asPdfDocument(SaleOrderPdf({ data })));
  }
}


