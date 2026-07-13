import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentsController } from "./adapters/in/controllers/payment.controller";
import { CreditQuotasController } from "./adapters/in/controllers/credit-quota.controller";
import { PaymentDocumentEntity } from "./adapters/out/persistence/typeorm/entities/payment-document.entity";
import { CreditQuotaEntity } from "./adapters/out/persistence/typeorm/entities/credit-quota.entity";
import { PAYMENT_DOCUMENT_REPOSITORY } from "./domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY } from "./domain/ports/credit-quota.repository";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { CreateCreditQuotaUsecase } from "./application/usecases/credit-quota/create.usecase";
import { CreatePaymentUsecase } from "./application/usecases/payment/create.usecase";
import { DeletePaymentUsecase } from "./application/usecases/payment/delete.usecase";
import { paymentsModuleProviders } from "./composition/container";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { ApprovalRequestEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { MailModule } from "src/modules/mail";
import { AccountsPayableModule } from "src/modules/accounts-payable";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { PAYMENT_SEARCH } from "./domain/ports/payment-search.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentDocumentEntity,
      CreditQuotaEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
      PaymentMethodEntity,
      CompanyPaymentAccountEntity,
    ]),
    TypeOrmModule.forFeature([
      ApprovalRequestEntity,
      PurchaseHistoryEventEntity,
      PurchaseOrderEntity,
    ]),
    AccessControlModule,
    MailModule,
    AccountsPayableModule,
  ],
  controllers: [PaymentsController, CreditQuotasController],
  providers: [...paymentsModuleProviders],
  exports: [
    CreatePaymentUsecase,
    DeletePaymentUsecase,
    CreateCreditQuotaUsecase,
    PAYMENT_DOCUMENT_REPOSITORY,
    CREDIT_QUOTA_REPOSITORY,
    PAYMENT_SEARCH,
    CLOCK,
  ],
})
export class PaymentsModule {}
