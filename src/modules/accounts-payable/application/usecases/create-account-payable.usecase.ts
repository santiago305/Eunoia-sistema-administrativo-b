import { Inject } from "@nestjs/common";
import { ACCOUNT_PAYABLE_REPOSITORY, AccountPayableRepository } from "../../domain/ports/account-payable.repository";
import { AccountPayable } from "../../domain/entity/account-payable";
import { CreateAccountPayableInput } from "../dtos/input/create-account-payable.input";

export class CreateAccountPayableUsecase {
  constructor(
    @Inject(ACCOUNT_PAYABLE_REPOSITORY)
    private readonly repo: AccountPayableRepository,
  ) {}

  async execute(input: CreateAccountPayableInput, tx?: any): Promise<AccountPayable> {
    const existing = await this.repo.findByPurchaseAndQuota(input.purchaseId, input.quotaId, tx);
    if (existing) return existing;

    return this.repo.create(
      AccountPayable.create({
        purchaseId: input.purchaseId,
        quotaId: input.quotaId,
        supplierId: input.supplierId,
        description: input.description,
        currency: input.currency,
        amountTotal: input.amountTotal,
        dueDate: input.dueDate,
        createdByUserId: input.createdByUserId,
      }),
      tx,
    );
  }
}

