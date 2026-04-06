import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductionOrderEntity } from "../adapters/out/persistence/typeorm/entities/production_order.entity";
import { ProductionOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/production_order_item.entity";
import { ProductionOrdersController } from "../adapters/in/controllers/production-order.controller";
import { PRODUCTION_ORDER_REPOSITORY } from "../application/ports/production-order.repository";
import { InventoryModule } from "src/modules/inventory/infrastructure/inventory.module";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";
import { UsersModule } from "src/modules/users/infrastructure/users.module";
import { productionModuleProviders } from "../composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionOrderEntity, ProductionOrderItemEntity]),
    InventoryModule,
    CatalogModule,
    UsersModule,
  ],
  controllers: [ProductionOrdersController],
  providers: [...productionModuleProviders],
  exports: [PRODUCTION_ORDER_REPOSITORY],
})
export class ProductionModule {}
