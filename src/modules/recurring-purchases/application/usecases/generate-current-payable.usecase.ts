import { Inject, NotFoundException } from "@nestjs/common";
import { CreateAccountPayableUsecase } from "src/modules/accounts-payable";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchaseOrderFactory } from "src/modules/purchases/domain/factories/purchase-order.factory";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchasePaymentStatus } from "src/modules/purchases/domain/value-objects/purchase-payment-status";
import { ReceptionStatus } from "src/modules/purchases/domain/value-objects/reception-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Repository } from "typeorm";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { InjectRepository } from "@nestjs/typeorm";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { RecurringPurchaseNotificationService } from "../services/recurring-purchase-notification.service";

const RECURRING_PURCHASE_DUE_NOTIFICATION_PERMISSION = "recurring_purchases.receive_due_notifications";

export class GenerateCurrentPayableUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly templateRepo: RecurringPurchaseTemplateRepository,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: Pick<PurchaseOrderRepository, "create">,
    private readonly createAccountPayable: CreateAccountPayableUsecase,
    @InjectRepository(PurchaseHistoryEventEntity)
    private readonly historyRepo: Pick<Repository<PurchaseHistoryEventEntity>, "save">,
    private readonly notificationsService: NotificationsService,
    private readonly accessControlService: AccessControlService,
    private readonly recurringPurchaseNotificationService: RecurringPurchaseNotificationService,
  ) {}

  async execute(input: { templateId: string; generatedByUserId?: string; now?: Date }) {
    const now = input.now ?? new Date();

    return this.uow.runInTransaction(async (tx) => {
      const template = await this.templateRepo.findById(input.templateId, tx);
      if (!template) throw new NotFoundException("Recurrencia no encontrada");
      if (!template.isDue(now)) {
        return { generated: false, reason: "NOT_DUE" as const };
      }

      const periodKey = template.currentPeriodKey();
      if (template.lastGeneratedPeriodKey === periodKey) {
        return { generated: false, reason: "ALREADY_GENERATED" as const };
      }

      const purchase = await this.purchaseRepo.create(
        PurchaseOrderFactory.createNew({
          supplierId: template.supplierId,
          totalTaxed: template.amount,
          purchaseValue: template.amount,
          total: template.amount,
          currency: template.currency,
          paymentForm: PaymentFormType.CREDITO,
          note: template.description ?? template.name,
          purchaseType: template.purchaseType,
          receptionStatus: ReceptionStatus.NOT_REQUIRED,
          paymentStatus: PurchasePaymentStatus.PENDING,
          isRecurringSource: true,
          recurringTemplateId: template.recurringPurchaseTemplateId,
          requiresReceipt: false,
          requiresStockEntry: false,
          dateIssue: now,
          dateExpiration: template.nextDueDate,
          createdBy: input.generatedByUserId ?? template.createdByUserId,
        }),
        tx,
      );

      const payable = await this.createAccountPayable.execute(
        {
          purchaseId: purchase.poId,
          supplierId: template.supplierId,
          description: `${template.name} - periodo ${periodKey}`,
          currency: template.currency as any,
          amountTotal: template.amount,
          dueDate: template.nextDueDate,
          createdByUserId: input.generatedByUserId ?? template.createdByUserId,
        },
        tx,
      );

      const updated = await this.templateRepo.update(
        template.markGenerated({
          purchaseId: purchase.poId,
          accountPayableId: payable.accountPayableId,
          generatedAt: now,
        }),
        tx,
      );

      await this.historyRepo.save(
        {
          purchaseId: purchase.poId,
          eventType: "PAYABLE_CREATED",
          description: `Cuenta por pagar generada desde recurrente ${template.name}`,
          metadata: {
            recurringTemplateId: template.recurringPurchaseTemplateId,
            recurringPeriodKey: periodKey,
            accountPayableId: payable.accountPayableId,
          },
          performedByUserId: input.generatedByUserId ?? template.createdByUserId ?? null,
        },
        tx as any,
      );

      const recipientUserIds = await this.accessControlService.getUserIdsWithPermission(
        RECURRING_PURCHASE_DUE_NOTIFICATION_PERMISSION,
      );
      if (recipientUserIds.length) {
        const notification = this.recurringPurchaseNotificationService.buildPayableCreatedNotification({
          template,
          purchaseId: purchase.poId,
          accountPayableId: payable.accountPayableId,
          periodKey,
        });
        await this.notificationsService.createNotificationForUsers({
          recipientUserIds,
          ...notification,
        });
      }

      return {
        generated: true,
        purchaseId: purchase.poId,
        accountPayableId: payable.accountPayableId,
        template: updated,
      };
    });
  }
}
