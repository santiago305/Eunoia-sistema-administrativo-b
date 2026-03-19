import { Module } from "@nestjs/common";
import { PurchasesModule } from "src/modules/purchases/infrastructure/purchases.module";
import { SuppliersModule } from "src/modules/suppliers/suppliers.module";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { InventoryModule } from "src/modules/inventory/infrastructure/inventory.module";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";
import { ProductionModule } from "src/modules/production/infrastructure/production.module";
import { WarehousesModule } from "src/modules/warehouses/warehouses.module";
import { PdfGeneratedController } from "./adapters/in/controllers/pdf-generated.controller";
import { ReactPdfRenderer } from "./adapters/out/react-pdf/react-pdf.renderer";
import { GenerateInvoicePdfUseCase } from "./application/usecases/generate-invoice-pdf.usecase";
import { GeneratePurchaseOrderPdfUseCase } from "./application/usecases/generate-purchase-order-pdf.usecase";
import { GenerateProductionOrderPdfUseCase } from "./application/usecases/generate-production-order-pdf.usecase";
import { PDF_RENDERER } from "./domain/ports/pdf-renderer.port";

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
  providers: [
    GenerateInvoicePdfUseCase,
    GeneratePurchaseOrderPdfUseCase,
    GenerateProductionOrderPdfUseCase,
    { provide: PDF_RENDERER, useClass: ReactPdfRenderer },
  ],
  exports: [
    GenerateInvoicePdfUseCase,
    GeneratePurchaseOrderPdfUseCase,
    GenerateProductionOrderPdfUseCase,
    PDF_RENDERER,
  ],
})
export class PdfGeneratedModule {}

