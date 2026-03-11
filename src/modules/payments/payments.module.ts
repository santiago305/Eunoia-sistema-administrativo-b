import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentsController } from "./adapters/in/controllers/payment.controller";
import { CreditQuotasController } from "./adapters/in/controllers/credit-quota.controller";
import { PaymentDocumentEntity } from "./adapters/out/persistence/typeorm/entities/payment-document.entity";
import { CreditQuotaEntity } from "./adapters/out/persistence/typeorm/entities/credit-quota.entity";
import { PaymentDocumentTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/payment-document.typeorm.repo";
import { CreditQuotaTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/credit-quota.typeorm.repo";
import { CreatePaymentUsecase } from "./application/usecases/payment/create.usecase";
import { DeletePaymentUsecase } from "./application/usecases/payment/delete.usecase";
import { GetPaymentUsecase } from "./application/usecases/payment/get-by-id.usecase";
import { GetPaymentsByPoIdUsecase } from "./application/usecases/payment/get-by-po-id.usecase";
import { ListPaymentsUsecase } from "./application/usecases/payment/list.usecase";
import { CreateCreditQuotaUsecase } from "./application/usecases/credit-quota/create.usecase";
import { DeleteCreditQuotaUsecase } from "./application/usecases/credit-quota/delete.usecase";
import { GetCreditQuotaUsecase } from "./application/usecases/credit-quota/get-by-id.usecase";
import { GetCreditQuotasByPoIdUsecase } from "./application/usecases/credit-quota/get-by-po-id.usecase";
import { ListCreditQuotasUsecase } from "./application/usecases/credit-quota/list.usecase";
import { PAYMENT_DOCUMENT_REPOSITORY } from "./domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY } from "./domain/ports/credit-quota.repository";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentDocumentEntity, CreditQuotaEntity])],
  controllers: [PaymentsController, CreditQuotasController],
  providers: [
    CreatePaymentUsecase,
    DeletePaymentUsecase,
    GetPaymentUsecase,
    GetPaymentsByPoIdUsecase,
    ListPaymentsUsecase,
    CreateCreditQuotaUsecase,
    DeleteCreditQuotaUsecase,
    GetCreditQuotaUsecase,
    GetCreditQuotasByPoIdUsecase,
    ListCreditQuotasUsecase,
    { provide: PAYMENT_DOCUMENT_REPOSITORY, useClass: PaymentDocumentTypeormRepository },
    { provide: CREDIT_QUOTA_REPOSITORY, useClass: CreditQuotaTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
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
