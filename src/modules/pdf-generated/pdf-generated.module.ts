import { Module } from "@nestjs/common";
import { PurchasesModule } from "src/modules/purchases/infrastructure/purchases.module";
import { SuppliersModule } from "src/modules/suppliers/suppliers.module";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { InventoryModule } from "src/modules/inventory/infrastructure/inventory.module";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";
import { ProductionModule } from "src/modules/production/infrastructure/production.module";
import { WarehousesModule } from "src/modules/warehouses/warehouses.module";
import { PdfGeneratedController } from "./adapters/in/controllers/pdf-generated.controller";
import { GenerateInventoryDocumentPdfUseCase } from "./application/usecases/generate-inventory-document-pdf.usecase";
import { GenerateInvoicePdfUseCase } from "./application/usecases/generate-invoice-pdf.usecase";
import { GenerateProductionOrderPdfUseCase } from "./application/usecases/generate-production-order-pdf.usecase";
import { GeneratePurchaseOrderPdfUseCase } from "./application/usecases/generate-purchase-order-pdf.usecase";
import { PDF_RENDERER } from "./domain/ports/pdf-renderer.port";
import { pdfGeneratedModuleProviders } from "./composition/container";

@Module({
  imports: [
    PurchasesModule,
    SuppliersModule,
    CompaniesModule,
    InventoryModule,
    CatalogModule,
    ProductionModule,
    WarehousesModule,
  ],
  controllers: [PdfGeneratedController],
  providers: [...pdfGeneratedModuleProviders],
  exports: [
    GenerateInvoicePdfUseCase,
    GeneratePurchaseOrderPdfUseCase,
    GenerateProductionOrderPdfUseCase,
    GenerateInventoryDocumentPdfUseCase,
    PDF_RENDERER,
  ],
})
export class PdfGeneratedModule {}



