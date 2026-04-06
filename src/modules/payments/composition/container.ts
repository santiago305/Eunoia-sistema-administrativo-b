import { Provider } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/modules/inventory/application/ports/clock.port";
import { CreditQuotaTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/credit-quota.typeorm.repo";
import { PaymentDocumentTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/payment-document.typeorm.repo";
import { paymentsUsecasesProviders } from "../application/providers/payments-usecases.providers";
import { CREDIT_QUOTA_REPOSITORY } from "../domain/ports/credit-quota.repository";
import { PAYMENT_DOCUMENT_REPOSITORY } from "../domain/ports/payment-document.repository";

export const paymentsModuleProviders: Provider[] = [
  ...paymentsUsecasesProviders,
  { provide: PAYMENT_DOCUMENT_REPOSITORY, useClass: PaymentDocumentTypeormRepository },
  { provide: CREDIT_QUOTA_REPOSITORY, useClass: CreditQuotaTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];
