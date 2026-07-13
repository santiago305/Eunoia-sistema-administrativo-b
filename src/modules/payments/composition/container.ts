import { Provider } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { CreditQuotaTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/credit-quota.typeorm.repo";
import { PaymentDocumentTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/payment-document.typeorm.repo";
import { PaymentSearchTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/payment-search.typeorm.repo";
import { paymentsUsecasesProviders } from "../application/providers/payments-usecases.providers";
import { CREDIT_QUOTA_REPOSITORY } from "../domain/ports/credit-quota.repository";
import { PAYMENT_DOCUMENT_REPOSITORY } from "../domain/ports/payment-document.repository";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import { PAYMENT_SEARCH } from "../domain/ports/payment-search.repository";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";

export const paymentsModuleProviders: Provider[] = [
  ...paymentsUsecasesProviders,
  { provide: PAYMENT_DOCUMENT_REPOSITORY, useClass: PaymentDocumentTypeormRepository },
  { provide: CREDIT_QUOTA_REPOSITORY, useClass: CreditQuotaTypeormRepository },
  { provide: PAYMENT_SEARCH, useClass: PaymentSearchTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
  PurchaseHistoryService,
];

