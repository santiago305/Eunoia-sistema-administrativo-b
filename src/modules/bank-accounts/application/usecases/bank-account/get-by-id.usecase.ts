import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { BankAccountNotFoundError } from "src/modules/bank-accounts/application/errors/bank-account-not-found.error";
import { BankAccountOutputMapper } from "src/modules/bank-accounts/application/mappers/bank-account-output.mapper";

type GetBankAccountByIdInput = { bankAccountId: string };

export class GetBankAccountByIdUsecase {
  constructor(
    @Inject(BANK_ACCOUNT_REPOSITORY)
    private readonly bankAccountRepo: BankAccountRepository,
  ) {}

  async execute(input: GetBankAccountByIdInput) {
    const existing = await this.bankAccountRepo.findById(input.bankAccountId);
    if (!existing) {
      throw new NotFoundException(new BankAccountNotFoundError().message);
    }
    return successResponse("Cuenta bancaria encontrada", BankAccountOutputMapper.toOutput(existing));
  }
}

