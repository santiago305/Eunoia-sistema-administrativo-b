import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { BankAccount } from "src/modules/bank-accounts/domain/entity/bank-account";
import { InvalidBankAccountError } from "src/modules/bank-accounts/domain/errors/invalid-bank-account.error";
import { BankAccountOutputMapper } from "src/modules/bank-accounts/application/mappers/bank-account-output.mapper";

type CreateBankAccountInput = {
  companyId: string;
  name: string;
  number?: string | null;
  isActive?: boolean;
};

export class CreateBankAccountUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(BANK_ACCOUNT_REPOSITORY)
    private readonly bankAccountRepo: BankAccountRepository,
  ) {}

  async execute(input: CreateBankAccountInput) {
    return this.uow.runInTransaction(async (tx) => {
      const company = await this.companyRepo.findById(input.companyId, tx);
      if (!company) {
        throw new NotFoundException("Empresa no encontrada");
      }

      let account: BankAccount;
      try {
        account = BankAccount.create({
          companyId: input.companyId,
          name: input.name,
          number: input.number,
          isActive: input.isActive ?? true,
        });
      } catch (error) {
        if (error instanceof InvalidBankAccountError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      if (account.number) {
        const existing = await this.bankAccountRepo.findDuplicate(account.companyId, account.number, tx);
        if (existing) {
          throw new ConflictException("La cuenta bancaria ya existe");
        }
      }

      try {
        const saved = await this.bankAccountRepo.create(account, tx);
        return successResponse("Cuenta bancaria creada correctamente", BankAccountOutputMapper.toOutput(saved));
      } catch (error: any) {
        if (error?.code === "23505") {
          throw new ConflictException("La cuenta bancaria ya existe");
        }
        throw new BadRequestException("No se pudo crear la cuenta bancaria");
      }
    });
  }
}

