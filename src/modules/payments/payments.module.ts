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
import { NotificationsModule } from "src/modules/notifications";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentDocumentEntity, CreditQuotaEntity]),
    TypeOrmModule.forFeature([
      ApprovalRequestEntity,
      PurchaseHistoryEventEntity,
      PurchaseOrderEntity,
    ]),
    AccessControlModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController, CreditQuotasController],
  providers: [...paymentsModuleProviders],
  exports: [
    CreatePaymentUsecase,
    DeletePaymentUsecase,
    CreateCreditQuotaUsecase,
    PAYMENT_DOCUMENT_REPOSITORY,
    CREDIT_QUOTA_REPOSITORY,
    CLOCK,
  ],
})
export class PaymentsModule {}
