import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseOrdersController } from "../adapters/in/controllers/purchase-order.controller";
import { PurchaseOrderEntity } from "../adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/purchase-order-item.entity";
import { PURCHASE_ORDER } from "../domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM } from "../domain/ports/purchase-order-item.port.repository";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { UsersModule } from "src/modules/users/infrastructure/users.module";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { purchasesModuleProviders } from "../composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrderEntity, PurchaseOrderItemEntity]),
    PaymentsModule,
    ProductCatalogModule,
    UsersModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [...purchasesModuleProviders],
  exports: [PURCHASE_ORDER, PURCHASE_ORDER_ITEM],
})
export class PurchasesModule {}
