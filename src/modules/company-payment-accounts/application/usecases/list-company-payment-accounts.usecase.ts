import { Inject } from "@nestjs/common";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CompanyPaymentAccountRepository,
} from "../../domain/ports/company-payment-account.repository";
import { CompanyPaymentAccountOutputMapper } from "../mappers/company-payment-account-output.mapper";

export class ListCompanyPaymentAccountsUsecase {
  constructor(
    @Inject(COMPANY_PAYMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: CompanyPaymentAccountRepository,
  ) {}

  async execute(input: { companyId: string }) {
    const items = await this.accountRepo.listByCompany(input.companyId);
    return { items: items.map(CompanyPaymentAccountOutputMapper.toOutput) };
  }
}
