import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateListParams,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";

export class ListRecurringPurchasesUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly repo: RecurringPurchaseTemplateRepository,
  ) {}

  async execute(input: RecurringPurchaseTemplateListParams) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 25;
    const result = await this.repo.list({
      ...input,
      page,
      limit,
    });
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
