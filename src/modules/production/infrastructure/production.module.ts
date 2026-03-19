import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductionOrderEntity } from "../adapters/out/persistence/typeorm/entities/production_order.entity";
import { ProductionOrderItemEntity } from "../adapters/out/persistence/typeorm/entities/production_order_item.entity";
import { ProductionOrdersController } from "../adapters/in/controllers/production-order.controller";
import { ProductionOrderTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/production-order.typeorm.repo";
import { PRODUCTION_ORDER_REPOSITORY } from "../domain/ports/production-order.repository";
import { CreateProductionOrder } from "../application/usecases/production-order/create.usecase";
import { ListProductionOrders } from "../application/usecases/production-order/list-orders.usecase";
import { GetProductionOrder } from "../application/usecases/production-order/get-record.usecase";
import { UpdateProductionOrder } from "../application/usecases/production-order/update-production-order.usecase";
import { StartProductionOrder } from "../application/usecases/production-order/start.usecase";
import { CloseProductionOrder } from "../application/usecases/production-order/close.usecase";
import { CancelProductionOrder } from "../application/usecases/production-order/cancel.usecase";
import { AddProductionOrderItem } from "../application/usecases/production-order/add-item.usecase";
import { RemoveProductionOrderItem } from "../application/usecases/production-order/remove-production-order-item.usecase";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { BuildConsumptionFromRecipesUseCase } from "../application/usecases/production-order/build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "../application/usecases/production-order/consume-reserved-materials.usecase";
import { PostProductionDocumentsUseCase } from "../application/usecases/production-order/post-production-documents.usecase";
import { RunProductionTimeUsecase } from "../application/usecases/production-order/run-production-time.usecase";
import { ProductionOrderExpectedScheduler } from "../application/jobs/production-order-expected-scheduler";
import { ProductionOrderExpectedBootstrap } from "../application/jobs/production-order-expected-bootstrap";
import { InventoryModule } from "src/modules/inventory/infrastructure/inventory.module";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";
import { UsersModule } from "src/modules/users/infrastructure/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionOrderEntity, ProductionOrderItemEntity]),
    InventoryModule,
    CatalogModule,
    UsersModule,
  ],
  controllers: [ProductionOrdersController],
  providers: [
    CreateProductionOrder,
    ListProductionOrders,
    GetProductionOrder,
    UpdateProductionOrder,
    StartProductionOrder,
    CloseProductionOrder,
    CancelProductionOrder,
    AddProductionOrderItem,
    RemoveProductionOrderItem,
    BuildConsumptionFromRecipesUseCase,
    ConsumeReservedMaterialsUseCase,
    PostProductionDocumentsUseCase,
    RunProductionTimeUsecase,
    ProductionOrderExpectedScheduler,
    ProductionOrderExpectedBootstrap,
    { provide: PRODUCTION_ORDER_REPOSITORY, useClass: ProductionOrderTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  ],
  exports: [PRODUCTION_ORDER_REPOSITORY],
})
export class ProductionModule {}
