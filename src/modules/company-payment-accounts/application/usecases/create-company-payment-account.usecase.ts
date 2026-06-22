import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { CompanyPaymentAccount, CompanyPaymentAccountType } from "../../domain/entity/company-payment-account";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CompanyPaymentAccountRepository,
} from "../../domain/ports/company-payment-account.repository";
import { CompanyPaymentAccountOutputMapper } from "../mappers/company-payment-account-output.mapper";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export type CreateCompanyPaymentAccountInput = {
  companyId: string;
  type: CompanyPaymentAccountType;
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  cardLastFour?: string | null;
  walletName?: string | null;
  currency: CurrencyType;
  isActive?: boolean;
};

export class CreateCompanyPaymentAccountUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(COMPANY_PAYMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: CompanyPaymentAccountRepository,
  ) {}

  async execute(input: CreateCompanyPaymentAccountInput) {
    return this.uow.runInTransaction(async (tx) => {
      const company = await this.companyRepo.findById(input.companyId, tx);
      if (!company) throw new NotFoundException("Empresa no encontrada");

      let account: CompanyPaymentAccount;
      try {
        account = CompanyPaymentAccount.create(input);
      } catch {
        throw new BadRequestException("Datos de cuenta de pago invalidos");
      }

      if (account.accountNumber) {
        const duplicate = await this.accountRepo.findDuplicate(account.companyId, account.accountNumber, tx);
        if (duplicate) throw new ConflictException("La cuenta de pago ya existe");
      }

      const saved = await this.accountRepo.create(account, tx);
      return successResponse("Cuenta de pago creada correctamente", CompanyPaymentAccountOutputMapper.toOutput(saved));
    });
  }
}
