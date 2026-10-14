import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { SaleOrderAttachmentsModule } from "src/modules/sale-order-attachments/sale-order-attachments.module";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { SaleOrderAuditEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-audit.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { SaleOrdersModule } from "src/modules/sale-orders/sale-orders.module";
import { IncomeController } from "./adapters/in/controllers/income.controller";
import { IncomeQueryTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/income-query.typeorm.repo";
import { GetIncomeSummaryUsecase } from "./application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "./application/usecases/list-income.usecase";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "./application/usecases/get-income-evidence.usecase";
import { GetIncomeSearchStateUsecase } from "./application/usecases/income-search/get-state.usecase";
import { SaveIncomeSearchMetricUsecase } from "./application/usecases/income-search/save-metric.usecase";
import { DeleteIncomeSearchMetricUsecase } from "./application/usecases/income-search/delete-metric.usecase";
import { ManageIncomePaymentsUsecase } from "./application/usecases/manage-income-payments.usecase";
import { INCOME_QUERY_REPOSITORY } from "./domain/ports/income-query.repository";
import { FinancialOutboxPublisher } from "./infrastructure/financial-outbox-publisher.service";
import { ExportIncomeExcelUsecase } from "./application/usecases/export-income-excel.usecase";
import { IncomeResourceScopeGuard } from "./adapters/in/guards/income-resource-scope.guard";
import { IncomeEvidenceAccessUsecase } from "./application/usecases/income-evidence-access.usecase";
import { IncomeEvidenceUploadRecoveryService } from "./infrastructure/income-evidence-upload-recovery.service";
import { IncomeEvidenceRevisionsUsecase } from "./application/usecases/income-evidence-revisions.usecase";
import { IncomeEvidenceQuarantineUsecase } from "./application/usecases/income-evidence-quarantine.usecase";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalePaymentEntity,
      SaleOrderEntity,
      ClientEntity,
      CompanyPaymentAccountEntity,
      SaleOrderAuditEntity,
      PaymentMethodEntity,
      ListingSearchMetricEntity,
      ListingSearchRecentEntity,
    ]),
    AccessControlModule,
    SaleOrderAttachmentsModule,
    SaleOrdersModule,
  ],
  controllers: [IncomeController],
  providers: [
    ListIncomeUsecase,
    ExportIncomeExcelUsecase,
    GetIncomeSummaryUsecase,
    GetIncomeSearchStateUsecase,
    SaveIncomeSearchMetricUsecase,
    DeleteIncomeSearchMetricUsecase,
    ManageIncomePaymentsUsecase,
    FinancialOutboxPublisher,
    { provide: INCOME_QUERY_REPOSITORY, useClass: IncomeQueryTypeormRepository },
    { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
    GetIncomeEvidenceUsecase,
    IncomeEvidenceAccessUsecase,
    IncomeEvidenceRevisionsUsecase,
    IncomeEvidenceQuarantineUsecase,
    IncomeEvidenceUploadRecoveryService,
    UploadIncomeEvidenceUsecase,
    IncomeResourceScopeGuard,
  ],
})
export class IncomeModule {}
