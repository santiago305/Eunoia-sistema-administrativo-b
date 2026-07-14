import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountPayableEntity } from "src/modules/accounts-payable/adapters/out/persistence/typeorm/entities/account-payable.entity";
import { SubsidiaryEntity } from "src/modules/agencies/adapters/out/persistence/typeorm/entities/subsidiary.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { SaleOrderLogisticsPayableEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-logistics-payable.entity";
import { LogisticsPayablesTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/logistics-payables.typeorm.repo";
import { CreateLogisticsPayableForSaleOrderUsecase } from "./application/usecases/create-logistics-payable-for-sale-order.usecase";
import { ReconcileLogisticsPayableForSaleOrderUsecase } from "./application/usecases/reconcile-logistics-payable-for-sale-order.usecase";
import { LOGISTICS_PAYABLES_REPOSITORY } from "./domain/ports/logistics-payables.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleOrderLogisticsPayableEntity,
      SubsidiaryEntity,
      PurchaseOrderEntity,
      AccountPayableEntity,
    ]),
  ],
  providers: [
    CreateLogisticsPayableForSaleOrderUsecase,
    ReconcileLogisticsPayableForSaleOrderUsecase,
    { provide: LOGISTICS_PAYABLES_REPOSITORY, useClass: LogisticsPayablesTypeormRepository },
  ],
  exports: [CreateLogisticsPayableForSaleOrderUsecase, ReconcileLogisticsPayableForSaleOrderUsecase],
})
export class LogisticsPayablesModule {}
