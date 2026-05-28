import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { PacksModule } from "src/modules/packs/packs.module";
import { SaleOrderEntity } from "./adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SaleOrderItemEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SaleOrderItemComponentEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-item-component.entity";
import { SalePaymentEntity } from "./adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { saleOrdersModuleProviders } from "./composition/container";
import { SaleOrdersController } from "./adapters/in/controllers/sale-orders.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleOrderEntity, SaleOrderItemEntity, SaleOrderItemComponentEntity, SalePaymentEntity]),
    PacksModule,
    ProductCatalogModule,
  ],
  controllers: [SaleOrdersController],
  providers: [...saleOrdersModuleProviders],
})
export class SaleOrdersModule {}

