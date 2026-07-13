import { Inject, NotFoundException } from "@nestjs/common";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RecurringPurchaseOutput } from "../dtos/recurring-purchase.output";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";

export class UpdateRecurringPurchaseUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly repo: RecurringPurchaseTemplateRepository,
  ) {}

  async execute(input: {
    recurringPurchaseTemplateId: string;
    supplierId: string;
    name: string;
    description?: string;
    frequency: "MONTHLY" | "ANNUAL";
    purchaseType?: any;
    currency: any;
    amount: number;
    startDate: Date;
    nextDueDate?: Date;
    reminderDaysBefore?: number[];
  }): Promise<RecurringPurchaseOutput> {
    const existing = await this.repo.findById(input.recurringPurchaseTemplateId);
    if (!existing) throw new NotFoundException("Compra recurrente no encontrada");

    const updated = RecurringPurchaseTemplate.create({
      recurringPurchaseTemplateId: existing.recurringPurchaseTemplateId,
      supplierId: input.supplierId,
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      purchaseType: input.purchaseType,
      currency: input.currency,
      amount: input.amount,
      startDate: input.startDate,
      nextDueDate: input.nextDueDate,
      status: existing.status,
      reminderDaysBefore: input.reminderDaysBefore,
      createdByUserId: existing.createdByUserId,
      lastGeneratedAt: existing.lastGeneratedAt,
      lastGeneratedPeriodKey: existing.lastGeneratedPeriodKey,
      lastGeneratedPurchaseId: existing.lastGeneratedPurchaseId,
      lastGeneratedAccountPayableId: existing.lastGeneratedAccountPayableId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    return toRecurringPurchaseOutput(await this.repo.update(updated));
  }
}
