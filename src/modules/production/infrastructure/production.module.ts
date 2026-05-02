import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductionOrderEntity } from "../adapters/out/persistence/typeorm/entities/production_order.entity";
import { ProductionOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/production_order_item.entity";
import { ProductionOrdersController } from "../adapters/in/controllers/production-order.controller";
import { PRODUCTION_ORDER_REPOSITORY } from "../application/ports/production-order.repository";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { ProductCatalogProductEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { UsersModule } from "src/modules/users/infrastructure/users.module";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { ProductCatalogDocumentSerieEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/document-serie.entity";
import { productionModuleProviders } from "../composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionOrderEntity,
      ProductionOrderItemEntity,
      WarehouseEntity,
      ProductCatalogDocumentSerieEntity,
      ProductCatalogProductEntity,
      ProductCatalogSkuEntity,
      ProductCatalogStockItemEntity,
      User,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
    ]),
    ProductCatalogModule,
    UsersModule,
  ],
  controllers: [ProductionOrdersController],
  providers: [...productionModuleProviders],
  exports: [PRODUCTION_ORDER_REPOSITORY],
})
export class ProductionModule {}
