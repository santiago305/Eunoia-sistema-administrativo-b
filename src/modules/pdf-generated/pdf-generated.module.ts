import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { PurchasesModule } from "src/modules/purchases/infrastructure/purchases.module";
import { SuppliersModule } from "src/modules/suppliers/suppliers.module";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { ProductionModule } from "src/modules/production/infrastructure/production.module";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { WarehousesModule } from "src/modules/warehouses/warehouses.module";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SaleOrderItemEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SaleOrderItemComponentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item-component.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { PdfGeneratedController } from "./adapters/in/controllers/pdf-generated.controller";
import { GenerateInventoryDocumentPdfUseCase } from "./application/usecases/generate-inventory-document-pdf.usecase";
import { GenerateInvoicePdfUseCase } from "./application/usecases/generate-invoice-pdf.usecase";
import { GenerateProductionOrderPdfUseCase } from "./application/usecases/generate-production-order-pdf.usecase";
import { GeneratePurchaseOrderPdfUseCase } from "./application/usecases/generate-purchase-order-pdf.usecase";
import { GenerateSaleOrderPdfUseCase } from "./application/usecases/generate-sale-order-pdf.usecase";
import { PDF_RENDERER } from "./domain/ports/pdf-renderer.port";
import { pdfGeneratedModuleProviders } from "./composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleOrderEntity,
      SaleOrderItemEntity,
      SaleOrderItemComponentEntity,
      SalePaymentEntity,
      ClientEntity,
      WarehouseEntity,
      ProductCatalogSkuEntity,
    ]),
    PurchasesModule,
    AccessControlModule,
    SuppliersModule,
    CompaniesModule,
    ProductCatalogModule,
    ProductionModule,
    WarehousesModule,
  ],
  controllers: [PdfGeneratedController],
  providers: [...pdfGeneratedModuleProviders],
  exports: [
    GenerateInvoicePdfUseCase,
    GeneratePurchaseOrderPdfUseCase,
    GenerateSaleOrderPdfUseCase,
    GenerateProductionOrderPdfUseCase,
    GenerateInventoryDocumentPdfUseCase,
    PDF_RENDERER,
  ],
})
export class PdfGeneratedModule {}



