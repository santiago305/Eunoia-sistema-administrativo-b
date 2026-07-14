import { Module } from "@nestjs/common";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { AdminFinanceController } from "./adapters/in/controllers/admin-finance.controller";
import { AdminFinanceQueryTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/admin-finance-query.typeorm.repo";
import { GetAdminFinanceSummaryUsecase } from "./application/usecases/get-admin-finance-summary.usecase";
import { ListAdminFinanceMovementsUsecase } from "./application/usecases/list-admin-finance-movements.usecase";
import { ADMIN_FINANCE_QUERY_REPOSITORY } from "./domain/ports/admin-finance-query.repository";

@Module({
  imports: [AccessControlModule],
  controllers: [AdminFinanceController],
  providers: [
    GetAdminFinanceSummaryUsecase,
    ListAdminFinanceMovementsUsecase,
    {
      provide: ADMIN_FINANCE_QUERY_REPOSITORY,
      useClass: AdminFinanceQueryTypeormRepository,
    },
  ],
})
export class AdminFinanceModule {}
