import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { RecurringPurchaseTemplate } from "../../domain/entity/recurring-purchase-template";
import { RecurringPurchaseOutput } from "../dtos/recurring-purchase.output";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";

export class CreateRecurringPurchaseUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly repo: RecurringPurchaseTemplateRepository,
  ) {}

  async execute(input: {
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
    createdByUserId?: string;
  }): Promise<RecurringPurchaseOutput> {
    const template = await this.repo.create(RecurringPurchaseTemplate.create(input));
    return toRecurringPurchaseOutput(template);
  }
}
