import { GenerateInventoryDocumentPdfInput } from "../dtos/inventory-document/input/generate-inventory-document.input";
import { GenerateInvoiceInput } from "../dtos/invoice/input/generate-invoice.input";
import { GenerateProductionOrderPdfInput } from "../dtos/production-order/input/generate-production-order.input";
import { GeneratePurchaseOrderPdfInput } from "../dtos/purchase-order/input/generate-purchase-order.input";

export class PdfGeneratedHttpMapper {
  static toInvoiceInput(dto: GenerateInvoiceInput): GenerateInvoiceInput {
    return dto;
  }

  static toPurchaseOrderInput(poId: string): GeneratePurchaseOrderPdfInput {
    return { poId };
  }

  static toProductionOrderInput(productionId: string): GenerateProductionOrderPdfInput {
    return { productionId };
  }

  static toInventoryDocumentInput(docId: string): GenerateInventoryDocumentPdfInput {
    return { docId };
  }
}
