import { Injectable, Logger } from "@nestjs/common";
import { GenerateCurrentPayableUsecase } from "../usecases/generate-current-payable.usecase";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { Inject } from "@nestjs/common";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import {
  RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY,
  RecurringPurchaseReminderDeliveryRepository,
} from "../../domain/ports/recurring-purchase-reminder-delivery.repository";
import { RecurringPurchaseNotificationService } from "../services/recurring-purchase-notification.service";

const RECURRING_PURCHASE_DUE_NOTIFICATION_PERMISSION = "recurring_purchases.receive_due_notifications";

@Injectable()
export class RecurringPurchaseDailyJob {
  private readonly logger = new Logger(RecurringPurchaseDailyJob.name);

  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly templateRepo: RecurringPurchaseTemplateRepository,
    private readonly generateCurrentPayable: GenerateCurrentPayableUsecase,
    private readonly notificationsService: NotificationsService,
    @Inject(RECURRING_PURCHASE_REMINDER_DELIVERY_REPOSITORY)
    private readonly reminderDeliveryRepo: RecurringPurchaseReminderDeliveryRepository,
    private readonly accessControlService: AccessControlService,
    private readonly recurringPurchaseNotificationService: RecurringPurchaseNotificationService,
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
      if (template.lastGeneratedPeriodKey === template.currentPeriodKey()) {
        continue;
      }
      const rawDaysUntilDue = Math.ceil(
        (template.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysUntilDue = Object.is(rawDaysUntilDue, -0) ? 0 : rawDaysUntilDue;
      if (!template.reminderDaysBefore.includes(daysUntilDue)) continue;
      const reminderKey = {
        templateId: template.recurringPurchaseTemplateId,
        periodKey: template.currentPeriodKey(),
        dueDate: template.nextDueDate,
        daysBefore: daysUntilDue,
      };
      if (await this.reminderDeliveryRepo.hasDelivery(reminderKey)) continue;
      const recipientUserIds = await this.accessControlService.getUserIdsWithPermission(
        RECURRING_PURCHASE_DUE_NOTIFICATION_PERMISSION,
      );
      if (!recipientUserIds.length) continue;
      const notification = this.recurringPurchaseNotificationService.buildDueReminderNotification({
        template,
        daysUntilDue,
      });
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds,
        ...notification,
      });
      await this.reminderDeliveryRepo.recordDelivery({ ...reminderKey, sentAt: now });
      sent += 1;
    }
    return sent;
  }
}
