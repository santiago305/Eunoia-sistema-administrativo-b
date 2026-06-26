import { Inject, NotFoundException } from "@nestjs/common";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";

export class CancelRecurringPurchaseUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly repo: RecurringPurchaseTemplateRepository,
  ) {}

  async execute(id: string) {
    const template = await this.repo.findById(id);
    if (!template) throw new NotFoundException("Recurrencia no encontrada");
    return toRecurringPurchaseOutput(await this.repo.update(template.cancel()));
  }
}
