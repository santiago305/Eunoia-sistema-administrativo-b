import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CompanyPaymentAccountRepository,
} from "../../domain/ports/company-payment-account.repository";
import {
  CompanyPaymentAccount,
  CompanyPaymentAccountValidationError,
} from "../../domain/entity/company-payment-account";
import { CompanyPaymentAccountOutputMapper } from "../mappers/company-payment-account-output.mapper";
import { successResponse } from "src/shared/response-standard/response";

export class UpdateCompanyPaymentAccountUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(COMPANY_PAYMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: CompanyPaymentAccountRepository,
  ) {}

  async execute(input: Parameters<CompanyPaymentAccountRepository["update"]>[0] & { includeSensitive?: boolean }) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.accountRepo.findById(input.id, tx);
      if (!current) throw new NotFoundException("Cuenta de tesoreria no encontrada");

      const value = <T>(key: keyof typeof input, fallback: T): T =>
        Object.prototype.hasOwnProperty.call(input, key) ? (input[key] as T) : fallback;
      let next: CompanyPaymentAccount;
      try {
        next = CompanyPaymentAccount.create({
          companyPaymentAccountId: current.companyPaymentAccountId,
          companyId: current.companyId,
          type: input.type ?? current.type,
          usage: input.usage ?? current.usage,
          name: input.name ?? current.name,
          institutionName: value("institutionName", value("bankName", current.institutionName)),
          accountNumber: value("accountNumber", current.accountNumber),
          cci: value("cci", current.cci),
          cardLastFour: value("cardLastFour", current.cardLastFour),
          walletProvider: value("walletProvider", value("walletName", current.walletProvider)),
          walletPhone: value("walletPhone", current.walletPhone),
          holderName: value("holderName", current.holderName),
          currency: input.currency ?? current.currency,
          isActive: current.isActive,
          isDefault: input.isDefault ?? current.isDefault,
        });
      } catch (error) {
        throw new BadRequestException(
          error instanceof CompanyPaymentAccountValidationError
            ? error.message
            : "Datos de cuenta de tesoreria invalidos",
        );
      }

      const duplicate = await this.accountRepo.findDuplicate(next, input.id, tx);
      if (duplicate) throw new ConflictException("La cuenta de tesoreria ya existe");

      if (next.isDefault) {
        await this.accountRepo.clearDefaultForScope(
          next.companyId,
          next.currency,
          next.usage,
          input.id,
          tx,
        );
      }

      const updated = await this.accountRepo.update({
        id: input.id,
        type: next.type,
        usage: next.usage,
        name: next.name,
        institutionName: next.institutionName,
        accountNumber: next.accountNumber,
        cci: next.cci,
        cardLastFour: next.cardLastFour,
        walletProvider: next.walletProvider,
        walletPhone: next.walletPhone,
        holderName: next.holderName,
        currency: next.currency,
        isDefault: next.isDefault,
      }, tx);
      if (!updated) throw new NotFoundException("Cuenta de tesoreria no encontrada");

      return successResponse(
        "Cuenta de tesoreria actualizada correctamente",
        CompanyPaymentAccountOutputMapper.toOutput(updated, {
          includeSensitive: input.includeSensitive,
        }),
      );
    });
  }
}
