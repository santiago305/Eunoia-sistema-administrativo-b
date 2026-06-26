import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { RecurringStatus } from "../../domain/value-objects/recurring-status";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";

export class ListRecurringPurchasesUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly repo: RecurringPurchaseTemplateRepository,
  ) {}

  async execute(input: { status?: RecurringStatus; page?: number; limit?: number }) {
    const result = await this.repo.list(input);
    const totalPages = Math.max(Math.ceil(result.total / result.limit), 1);
    return {
      items: result.items.map(toRecurringPurchaseOutput),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
      hasPrev: result.page > 1,
      hasNext: result.page < totalPages,
    };
  }
}
