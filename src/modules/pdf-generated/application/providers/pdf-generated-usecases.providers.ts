import { Provider } from "@nestjs/common";
import { GenerateInventoryDocumentPdfUseCase } from "../usecases/generate-inventory-document-pdf.usecase";
import { GenerateInvoicePdfUseCase } from "../usecases/generate-invoice-pdf.usecase";
import { GenerateProductionOrderPdfUseCase } from "../usecases/generate-production-order-pdf.usecase";
import { GeneratePurchaseOrderPdfUseCase } from "../usecases/generate-purchase-order-pdf.usecase";
import { GenerateSaleOrderPdfUseCase } from "../usecases/generate-sale-order-pdf.usecase";

export const pdfGeneratedUsecasesProviders: Provider[] = [
  GenerateInvoicePdfUseCase,
  GeneratePurchaseOrderPdfUseCase,
  GenerateSaleOrderPdfUseCase,
  GenerateProductionOrderPdfUseCase,
  GenerateInventoryDocumentPdfUseCase,
];
