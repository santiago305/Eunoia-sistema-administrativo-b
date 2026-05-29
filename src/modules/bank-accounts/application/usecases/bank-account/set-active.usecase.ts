import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { BankAccountNotFoundError } from "src/modules/bank-accounts/application/errors/bank-account-not-found.error";

type SetBankAccountActiveInput = { bankAccountId: string; isActive: boolean };

export class SetBankAccountActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(BANK_ACCOUNT_REPOSITORY)
    private readonly bankAccountRepo: BankAccountRepository,
  ) {}

  async execute(input: SetBankAccountActiveInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.bankAccountRepo.findById(input.bankAccountId, tx);
      if (!current) {
        throw new NotFoundException(new BankAccountNotFoundError().message);
      }

      try {
        await this.bankAccountRepo.setActive(input.bankAccountId, input.isActive, tx);
      } catch {
        throw new BadRequestException("No se pudo actualizar el estado de la cuenta bancaria");
      }

      return successResponse("Estado de la cuenta bancaria actualizado");
    });
  }
}

