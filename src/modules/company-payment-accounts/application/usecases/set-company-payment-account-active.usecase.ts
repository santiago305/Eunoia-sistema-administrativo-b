import { Inject } from "@nestjs/common";
import { successResponse } from "src/shared/response-standard/response";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CompanyPaymentAccountRepository,
} from "../../domain/ports/company-payment-account.repository";

export class SetCompanyPaymentAccountActiveUsecase {
  constructor(
    @Inject(COMPANY_PAYMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: CompanyPaymentAccountRepository,
  ) {}

  async execute(input: { id: string; isActive: boolean }) {
    await this.accountRepo.setActive(input.id, input.isActive);
    return successResponse("Estado de cuenta de pago actualizado correctamente");
  }
}
