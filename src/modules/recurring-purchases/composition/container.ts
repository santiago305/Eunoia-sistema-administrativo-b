import { Provider } from "@nestjs/common";
import { RecurringPurchaseReminderDeliveryTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/recurring-purchase-reminder-delivery.typeorm.repo";
import { RecurringPurchaseSearchTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/recurring-purchase-search.typeorm.repo";
import { RecurringPurchaseTemplateTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/recurring-purchase-template.typeorm.repo";
import { CreateRecurringPurchaseUsecase } from "../application/usecases/create-recurring-purchase.usecase";
import { UpdateRecurringPurchaseUsecase } from "../application/usecases/update-recurring-purchase.usecase";
import { ListRecurringPurchasesUsecase } from "../application/usecases/list-recurring-purchases.usecase";
import { PauseRecurringPurchaseUsecase } from "../application/usecases/pause-recurring-purchase.usecase";
import { ResumeRecurringPurchaseUsecase } from "../application/usecases/resume-recurring-purchase.usecase";
import { CancelRecurringPurchaseUsecase } from "../application/usecases/cancel-recurring-purchase.usecase";
import { GenerateCurrentPayableUsecase } from "../application/usecases/generate-current-payable.usecase";
import { RegisterRecurringPurchasePaymentUsecase } from "../application/usecases/register-recurring-purchase-payment.usecase";
import { ExportRecurringPurchasesExcelUsecase } from "../application/usecases/export-recurring-purchases-excel.usecase";
import { DeleteRecurringPurchaseSearchMetricUsecase } from "../application/usecases/recurring-purchase-search/delete-metric.usecase";
import { GetRecurringPurchaseSearchStateUsecase } from "../application/usecases/recurring-purchase-search/get-state.usecase";
import { SaveRecurringPurchaseSearchMetricUsecase } from "../application/usecases/recurring-purchase-search/save-metric.usecase";
import { RecurringPurchaseDailyJob } from "../application/jobs/recurring-purchase-daily.job";
import { RecurringPurchaseNotificationService } from "../application/services/recurring-purchase-notification.service";
import { RECURRING_PURCHASE_TEMPLATE_REPOSITORY } from "../domain/ports/recurring-purchase-template.repository";
import { RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY } from "../domain/ports/recurring-purchase-reminder-delivery.repository";
import { RECURRING_PURCHASE_SEARCH } from "../domain/ports/recurring-purchase-search.repository";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";

export const recurringPurchasesModuleProviders: Provider[] = [
  CreateRecurringPurchaseUsecase,
  UpdateRecurringPurchaseUsecase,
  ListRecurringPurchasesUsecase,
  PauseRecurringPurchaseUsecase,
  ResumeRecurringPurchaseUsecase,
  CancelRecurringPurchaseUsecase,
  GenerateCurrentPayableUsecase,
  RegisterRecurringPurchasePaymentUsecase,
  ExportRecurringPurchasesExcelUsecase,
  GetRecurringPurchaseSearchStateUsecase,
  SaveRecurringPurchaseSearchMetricUsecase,
  DeleteRecurringPurchaseSearchMetricUsecase,
  RecurringPurchaseNotificationService,
  RecurringPurchaseDailyJob,
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: RECURRING_PURCHASE_SEARCH, useClass: RecurringPurchaseSearchTypeormRepository },
  { provide: RECURRING_PURCHASE_TEMPLATE_REPOSITORY, useClass: RecurringPurchaseTemplateTypeormRepository },
  {
    provide: RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY,
    useClass: RecurringPurchaseReminderDeliveryTypeormRepository,
  },
];
