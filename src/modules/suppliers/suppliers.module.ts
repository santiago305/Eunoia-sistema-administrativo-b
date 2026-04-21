import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { SupplierSkusController } from "./adapters/in/controllers/supplier-sku.controller";
import { SuppliersController } from "./adapters/in/controllers/supplier.controller";
import { SupplierSkuEntity } from "./adapters/out/persistence/typeorm/entities/supplier-sku.entity";
import { SupplierEntity } from "./adapters/out/persistence/typeorm/entities/supplier.entity";
import { SUPPLIER_REPOSITORY } from "./domain/ports/supplier.repository";
import { SUPPLIER_SKU_REPOSITORY } from "./domain/ports/supplier-sku.repository";
import { suppliersModuleProviders } from "./composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierEntity,
      SupplierSkuEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
    ]),
    ProductCatalogModule,
  ],
  controllers: [SuppliersController, SupplierSkusController],
  providers: [...suppliersModuleProviders],
  exports: [SUPPLIER_REPOSITORY, SUPPLIER_SKU_REPOSITORY],
})
export class SuppliersModule {}
