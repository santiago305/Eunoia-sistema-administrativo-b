import { Inject } from "@nestjs/common";
import { ACCOUNT_PAYABLE_REPOSITORY, AccountPayableRepository } from "../../domain/ports/account-payable.repository";
import { ListAccountPayablesInput } from "../dtos/input/list-account-payables.input";
import { AccountPayableOutputMapper } from "../mappers/account-payable-output.mapper";

export class ListAccountPayablesUsecase {
  constructor(
    @Inject(ACCOUNT_PAYABLE_REPOSITORY)
    private readonly repo: AccountPayableRepository,
  ) {}

  async execute(input: ListAccountPayablesInput = {}) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const result = await this.repo.list({ ...input, page, limit });
    return {
      items: result.items.map(AccountPayableOutputMapper.toOutput),
      total: result.total,
      page,
      limit,
    };
  }
}

