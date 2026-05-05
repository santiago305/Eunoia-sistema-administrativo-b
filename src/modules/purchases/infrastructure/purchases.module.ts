import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseOrdersController } from "../adapters/in/controllers/purchase-order.controller";
import { PurchaseOrderEntity } from "../adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/purchase-order-item.entity";
import { PURCHASE_ORDER } from "../domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM } from "../domain/ports/purchase-order-item.port.repository";
import { PURCHASE_SEARCH } from "../domain/ports/purchase-search.repository";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { UsersModule } from "src/modules/users/infrastructure/users.module";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { purchasesModuleProviders } from "../composition/container";
import { NotificationsModule } from "src/modules/notifications";
import { PurchaseProcessingApprovalEntity } from "../adapters/out/persistence/typeorm/entities/purchase-processing-approval.entity";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrderEntity,
      PurchaseProcessingApprovalEntity,
      User,
      PurchaseOrderItemEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
      SupplierEntity,
      WarehouseEntity,
    ]),
    PaymentsModule,
    ProductCatalogModule,
    UsersModule,
    NotificationsModule,
    AccessControlModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [...purchasesModuleProviders],
  exports: [PURCHASE_ORDER, PURCHASE_ORDER_ITEM, PURCHASE_SEARCH],
})
export class PurchasesModule {}
