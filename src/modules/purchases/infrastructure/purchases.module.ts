import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { PurchaseOrdersController } from "../adapters/in/controllers/purchase-order.controller";
import { PurchaseOrderEntity } from "../adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/purchase-order-item.entity";
import { PurchaseOrderTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/purchase-order.typeorm.repo";
import { PurchaseOrderItemTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/purchase-order-item.typeorm.repo";
import { CreatePurchaseOrderUsecase } from "../application/usecases/purchase-order/create.usecase";
import { UpdatePurchaseOrderUsecase } from "../application/usecases/purchase-order/update.usecase";
import { ListPurchaseOrdersUsecase } from "../application/usecases/purchase-order/list.usecase";
import { GetPurchaseOrderUsecase } from "../application/usecases/purchase-order/get-by-id.usecase";
import { SetPurchaseOrderActiveUsecase } from "../application/usecases/purchase-order/set-active.usecase";
import { AddPurchaseOrderItemUsecase } from "../application/usecases/purchase-order-item/add.usecase";
import { ListPurchaseOrderItemsUsecase } from "../application/usecases/purchase-order-item/list.usecase";
import { RemovePurchaseOrderItemUsecase } from "../application/usecases/purchase-order-item/remove.usecase";
import { PURCHASE_ORDER } from "../domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM } from "../domain/ports/purchase-order-item.port.repository";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { PurchaseOrderExpectedBootstrap } from "../application/jobs/purchase-order-expected-bootstrap";
import { PurchaseOrderExpectedScheduler } from "../application/jobs/purchase-order-expected-scheduler";
import { RunExpectedAtUsecase } from "../application/usecases/purchase-order/run-expected-at.usecase";
import { SetSentPurchaseOrderUsecase } from "../application/usecases/purchase-order/set-sent.usecase";
import { InventoryModule } from "src/modules/inventory/infrastructure/inventory.module";
import { PostInventoryFromPurchaseUsecase } from "../application/usecases/purchase-order/Inventory-purchase.usecase";
import { UsersModule } from "src/modules/users/infrastructure/users.module";
import { CancelPurchaseOrderUsecase } from "../application/usecases/purchase-order/cancel.usecase";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrderEntity, PurchaseOrderItemEntity]),
    PaymentsModule,
    InventoryModule,
    CatalogModule,
    UsersModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [
    CreatePurchaseOrderUsecase,
    UpdatePurchaseOrderUsecase,
    ListPurchaseOrdersUsecase,
    GetPurchaseOrderUsecase,
    SetPurchaseOrderActiveUsecase,
    AddPurchaseOrderItemUsecase,
    ListPurchaseOrderItemsUsecase,
    RemovePurchaseOrderItemUsecase,
    RunExpectedAtUsecase,
    PurchaseOrderExpectedScheduler,
    PurchaseOrderExpectedBootstrap,
    SetSentPurchaseOrderUsecase,
    CancelPurchaseOrderUsecase,
    PostInventoryFromPurchaseUsecase,
    { provide: PURCHASE_ORDER, useClass: PurchaseOrderTypeormRepository },
    { provide: PURCHASE_ORDER_ITEM, useClass: PurchaseOrderItemTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  ],
  exports: [PURCHASE_ORDER, PURCHASE_ORDER_ITEM],
})
export class PurchasesModule {}
