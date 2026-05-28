import { Inject, NotFoundException } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { BankAccountOutputMapper } from "src/modules/bank-accounts/application/mappers/bank-account-output.mapper";

type ListBankAccountsByCompanyInput = { companyId: string };

export class ListBankAccountsByCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(BANK_ACCOUNT_REPOSITORY)
    private readonly bankAccountRepo: BankAccountRepository,
  ) {}

  async execute(input: ListBankAccountsByCompanyInput) {
    const company = await this.companyRepo.findById(input.companyId);
    if (!company) {
      throw new NotFoundException("Empresa no encontrada");
    }

    const rows = await this.bankAccountRepo.listByCompany(input.companyId);
    return successResponse("Cuentas bancarias encontradas", rows.map((r) => BankAccountOutputMapper.toOutput(r)));
  }
}

