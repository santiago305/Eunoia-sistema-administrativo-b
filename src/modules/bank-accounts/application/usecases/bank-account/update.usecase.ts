import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { BankAccountNotFoundError } from "src/modules/bank-accounts/application/errors/bank-account-not-found.error";
import { BankAccountOutputMapper } from "src/modules/bank-accounts/application/mappers/bank-account-output.mapper";

type UpdateBankAccountInput = {
  bankAccountId: string;
  name?: string;
  number?: string | null;
};

export class UpdateBankAccountUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(BANK_ACCOUNT_REPOSITORY)
    private readonly bankAccountRepo: BankAccountRepository,
  ) {}

  async execute(input: UpdateBankAccountInput) {
    return this.uow.runInTransaction(async (tx) => {
      const hasNumber = Object.prototype.hasOwnProperty.call(input, "number");
      if (input.name === undefined && !hasNumber) {
        throw new BadRequestException("Debe enviar al menos un campo para actualizar");
      }

      const current = await this.bankAccountRepo.findById(input.bankAccountId, tx);
      if (!current) {
        throw new NotFoundException(new BankAccountNotFoundError().message);
      }

      const nextName = input.name !== undefined ? input.name.trim() : current.name;
      if (!nextName) {
        throw new BadRequestException("name es requerido");
      }

      const nextNumber = hasNumber
        ? (input.number === null || input.number === undefined ? null : (input.number.trim() || null))
        : current.number;

      if (nextNumber) {
        const duplicate = await this.bankAccountRepo.findDuplicate(current.companyId, nextNumber, tx);
        if (duplicate && duplicate.bankAccountId !== current.bankAccountId) {
          throw new ConflictException("La cuenta bancaria ya existe");
        }
      }

      try {
        const updated = await this.bankAccountRepo.update(
          {
            bankAccountId: input.bankAccountId,
            ...(input.name !== undefined ? { name: nextName } : {}),
            ...(hasNumber ? { number: nextNumber } : {}),
          },
          tx,
        );
        if (!updated) {
          throw new BadRequestException("No se pudo actualizar la cuenta bancaria");
        }

        return successResponse("Cuenta bancaria actualizada correctamente", BankAccountOutputMapper.toOutput(updated));
      } catch (error: any) {
        if (error?.code === "23505") {
          throw new ConflictException("La cuenta bancaria ya existe");
        }
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          throw error;
        }
        throw new BadRequestException("No se pudo actualizar la cuenta bancaria");
      }
    });
  }
}

