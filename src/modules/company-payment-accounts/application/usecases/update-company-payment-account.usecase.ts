import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CompanyPaymentAccountRepository,
} from "../../domain/ports/company-payment-account.repository";
import { CompanyPaymentAccountOutputMapper } from "../mappers/company-payment-account-output.mapper";
import { successResponse } from "src/shared/response-standard/response";

export class UpdateCompanyPaymentAccountUsecase {
  constructor(
    @Inject(COMPANY_PAYMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: CompanyPaymentAccountRepository,
  ) {}

  async execute(input: Parameters<CompanyPaymentAccountRepository["update"]>[0]) {
    const current = await this.accountRepo.findById(input.id);
    if (!current) throw new NotFoundException("Cuenta de pago no encontrada");
    if (input.isDefault) {
      await this.accountRepo.clearDefaultForCompany(current.companyId, input.id);
    }

    const updated = await this.accountRepo.update(input);
    if (!updated) throw new NotFoundException("Cuenta de pago no encontrada");
    return successResponse("Cuenta de pago actualizada correctamente", CompanyPaymentAccountOutputMapper.toOutput(updated));
  }
}
