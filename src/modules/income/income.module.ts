import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { SaleOrderAttachmentsModule } from "src/modules/sale-order-attachments/sale-order-attachments.module";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { SaleOrderAuditEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-audit.entity";
import { SaleOrdersModule } from "src/modules/sale-orders/sale-orders.module";
import { IncomeController } from "./adapters/in/controllers/income.controller";
import { IncomeQueryTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/income-query.typeorm.repo";
import { GetIncomeSummaryUsecase } from "./application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "./application/usecases/list-income.usecase";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "./application/usecases/get-income-evidence.usecase";
import { INCOME_QUERY_REPOSITORY } from "./domain/ports/income-query.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalePaymentEntity,
      SaleOrderEntity,
      ClientEntity,
      CompanyPaymentAccountEntity,
      SaleOrderAuditEntity,
    ]),
    AccessControlModule,
    SaleOrderAttachmentsModule,
    SaleOrdersModule,
  ],
  controllers: [IncomeController],
  providers: [
    ListIncomeUsecase,
    GetIncomeSummaryUsecase,
    { provide: INCOME_QUERY_REPOSITORY, useClass: IncomeQueryTypeormRepository },
    GetIncomeEvidenceUsecase,
    UploadIncomeEvidenceUsecase,
  ],
})
export class IncomeModule {}
