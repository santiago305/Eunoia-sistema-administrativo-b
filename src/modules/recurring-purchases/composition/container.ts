import { Provider } from "@nestjs/common";
import { RecurringPurchaseReminderDeliveryTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/recurring-purchase-reminder-delivery.typeorm.repo";
import { RecurringPurchaseTemplateTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/recurring-purchase-template.typeorm.repo";
import { CreateRecurringPurchaseUsecase } from "../application/usecases/create-recurring-purchase.usecase";
import { ListRecurringPurchasesUsecase } from "../application/usecases/list-recurring-purchases.usecase";
import { PauseRecurringPurchaseUsecase } from "../application/usecases/pause-recurring-purchase.usecase";
import { ResumeRecurringPurchaseUsecase } from "../application/usecases/resume-recurring-purchase.usecase";
import { CancelRecurringPurchaseUsecase } from "../application/usecases/cancel-recurring-purchase.usecase";
import { GenerateCurrentPayableUsecase } from "../application/usecases/generate-current-payable.usecase";
import { RegisterRecurringPurchasePaymentUsecase } from "../application/usecases/register-recurring-purchase-payment.usecase";
import { RecurringPurchaseDailyJob } from "../application/jobs/recurring-purchase-daily.job";
import { RecurringPurchaseNotificationService } from "../application/services/recurring-purchase-notification.service";
import { RECURRING_PURCHASE_TEMPLATE_REPOSITORY } from "../domain/ports/recurring-purchase-template.repository";
import { RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY } from "../domain/ports/recurring-purchase-reminder-delivery.repository";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";

export const recurringPurchasesModuleProviders: Provider[] = [
  CreateRecurringPurchaseUsecase,
  ListRecurringPurchasesUsecase,
  PauseRecurringPurchaseUsecase,
  ResumeRecurringPurchaseUsecase,
  CancelRecurringPurchaseUsecase,
  GenerateCurrentPayableUsecase,
  RegisterRecurringPurchasePaymentUsecase,
  RecurringPurchaseNotificationService,
  RecurringPurchaseDailyJob,
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: RECURRING_PURCHASE_TEMPLATE_REPOSITORY, useClass: RecurringPurchaseTemplateTypeormRepository },
  {
    provide: RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY,
    useClass: RecurringPurchaseReminderDeliveryTypeormRepository,
  },
];
