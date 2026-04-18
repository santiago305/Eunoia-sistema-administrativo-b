import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductionOrderEntity } from "../adapters/out/persistence/typeorm/entities/production_order.entity";
import { ProductionOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/production_order_item.entity";
import { ProductionOrdersController } from "../adapters/in/controllers/production-order.controller";
import { PRODUCTION_ORDER_REPOSITORY } from "../application/ports/production-order.repository";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { UsersModule } from "src/modules/users/infrastructure/users.module";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { productionModuleProviders } from "../composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionOrderEntity,
      ProductionOrderItemEntity,
      WarehouseEntity,
      ProductCatalogSkuEntity,
      ProductCatalogStockItemEntity,
    ]),
    ProductCatalogModule,
    UsersModule,
  ],
  controllers: [ProductionOrdersController],
  providers: [...productionModuleProviders],
  exports: [PRODUCTION_ORDER_REPOSITORY],
})
export class ProductionModule {}
