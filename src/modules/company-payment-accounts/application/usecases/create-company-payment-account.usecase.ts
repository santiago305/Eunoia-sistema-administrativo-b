import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import {
  CompanyPaymentAccount,
  CompanyPaymentAccountType,
  CompanyPaymentAccountUsage,
  CompanyPaymentAccountValidationError,
} from "../../domain/entity/company-payment-account";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CompanyPaymentAccountRepository,
} from "../../domain/ports/company-payment-account.repository";
import { CompanyPaymentAccountOutputMapper } from "../mappers/company-payment-account-output.mapper";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export type CreateCompanyPaymentAccountInput = {
  companyId: string;
  type: CompanyPaymentAccountType;
  usage?: CompanyPaymentAccountUsage;
  name: string;
  institutionName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  cci?: string | null;
  cardLastFour?: string | null;
  walletProvider?: string | null;
  walletName?: string | null;
  walletPhone?: string | null;
  holderName?: string | null;
  currency: CurrencyType;
  isActive?: boolean;
  isDefault?: boolean;
  includeSensitive?: boolean;
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
      } catch (error) {
        throw new BadRequestException(
          error instanceof CompanyPaymentAccountValidationError
            ? error.message
            : "Datos de cuenta de tesoreria invalidos",
        );
      }

      const duplicate = await this.accountRepo.findDuplicate(account, undefined, tx);
      if (duplicate) throw new ConflictException("La cuenta de tesoreria ya existe");

      if (account.isDefault) {
        await this.accountRepo.clearDefaultForScope(
          account.companyId,
          account.currency,
          account.usage,
          undefined,
          tx,
        );
      }

      const saved = await this.accountRepo.create(account, tx);
      return successResponse(
        "Cuenta de tesoreria creada correctamente",
        CompanyPaymentAccountOutputMapper.toOutput(saved, {
          includeSensitive: input.includeSensitive,
        }),
      );
    });
  }
}
