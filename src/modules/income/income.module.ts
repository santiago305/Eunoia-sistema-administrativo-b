import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { IncomeController } from "./adapters/in/controllers/income.controller";
import { IncomeQueryTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/income-query.typeorm.repo";
import { GetIncomeSummaryUsecase } from "./application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "./application/usecases/list-income.usecase";
import { INCOME_QUERY_REPOSITORY } from "./domain/ports/income-query.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalePaymentEntity,
      SaleOrderEntity,
      ClientEntity,
      CompanyPaymentAccountEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [IncomeController],
  providers: [
    ListIncomeUsecase,
    GetIncomeSummaryUsecase,
    { provide: INCOME_QUERY_REPOSITORY, useClass: IncomeQueryTypeormRepository },
  ],
})
export class IncomeModule {}
