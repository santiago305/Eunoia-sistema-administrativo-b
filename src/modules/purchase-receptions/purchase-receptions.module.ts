import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { PurchasesModule } from "src/modules/purchases/infrastructure/purchases.module";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchaseReceptionEntity } from "./adapters/out/persistence/typeorm/entities/purchase-reception.entity";
import { PurchaseReceptionItemEntity } from "./adapters/out/persistence/typeorm/entities/purchase-reception-item.entity";
import { PurchaseReceptionTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/purchase-reception.typeorm.repo";
import { PURCHASE_RECEPTION_REPOSITORY } from "./domain/ports/purchase-reception.repository";
import { CreatePurchaseReceptionUsecase } from "./application/usecases/create-purchase-reception.usecase";
import { ConfirmPurchaseReceptionUsecase } from "./application/usecases/confirm-purchase-reception.usecase";
import { ListPurchaseReceptionsUsecase } from "./application/usecases/list-purchase-receptions.usecase";
import { PurchaseReceptionsController } from "./adapters/in/controllers/purchase-receptions.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseReceptionEntity,
      PurchaseReceptionItemEntity,
      PurchaseHistoryEventEntity,
    ]),
    PurchasesModule,
    ProductCatalogModule,
  ],
  controllers: [PurchaseReceptionsController],
  providers: [
    CreatePurchaseReceptionUsecase,
    ConfirmPurchaseReceptionUsecase,
    ListPurchaseReceptionsUsecase,
    { provide: PURCHASE_RECEPTION_REPOSITORY, useClass: PurchaseReceptionTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  ],
  exports: [CreatePurchaseReceptionUsecase, ConfirmPurchaseReceptionUsecase, PURCHASE_RECEPTION_REPOSITORY],
})
export class PurchaseReceptionsModule {}
