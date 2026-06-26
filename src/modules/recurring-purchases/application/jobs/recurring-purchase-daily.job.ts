import { Injectable, Logger } from "@nestjs/common";
import { GenerateCurrentPayableUsecase } from "../usecases/generate-current-payable.usecase";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { Inject } from "@nestjs/common";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";

@Injectable()
export class RecurringPurchaseDailyJob {
  private readonly logger = new Logger(RecurringPurchaseDailyJob.name);

  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly templateRepo: RecurringPurchaseTemplateRepository,
    private readonly generateCurrentPayable: GenerateCurrentPayableUsecase,
    private readonly notificationsService: NotificationsService,
  ) {}

  async run(now = new Date()) {
    const dueTemplates = await this.templateRepo.findDueForGeneration(now);
    let generated = 0;
    for (const template of dueTemplates) {
      const result = await this.generateCurrentPayable.execute({
        templateId: template.recurringPurchaseTemplateId,
        generatedByUserId: template.createdByUserId,
        now,
      });
      if (result.generated) generated += 1;
    }

    const reminders = await this.sendReminders(now);
    this.logger.log(`Recurring purchases processed. generated=${generated} reminders=${reminders}`);
    return { generated, reminders };
  }

  private async sendReminders(now: Date) {
    const templates = await this.templateRepo.list({ status: "ACTIVE", page: 1, limit: 100 });
    let sent = 0;
    for (const template of templates.items) {
      if (!template.createdByUserId || template.lastGeneratedPeriodKey === template.currentPeriodKey()) {
        continue;
      }
      const daysUntilDue = Math.ceil(
        (template.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (!template.reminderDaysBefore.includes(daysUntilDue)) continue;
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [template.createdByUserId],
        type: "RECURRING_PURCHASE_REMINDER",
        category: "PURCHASES",
        title: "Recurrente por vencer",
        message: `${template.name} vence en ${daysUntilDue} dia(s).`,
        priority: daysUntilDue <= 1 ? "HIGH" : "NORMAL",
        actionUrl: "/compras/recurrentes",
        actionLabel: "Ver recurrentes",
        sourceModule: "recurring-purchases",
        sourceEntityType: "recurring_purchase_template",
        sourceEntityId: template.recurringPurchaseTemplateId,
        metadata: {
          recurringTemplateId: template.recurringPurchaseTemplateId,
          dueDate: template.nextDueDate,
          daysUntilDue,
        },
      });
      sent += 1;
    }
    return sent;
  }
}
