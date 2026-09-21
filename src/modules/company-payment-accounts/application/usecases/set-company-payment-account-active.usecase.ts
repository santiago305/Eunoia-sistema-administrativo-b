import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
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
    const current = await this.accountRepo.findById(input.id);
    if (!current) throw new NotFoundException("Cuenta de tesoreria no encontrada");
    if (!input.isActive && current.isDefault) {
      throw new BadRequestException(
        "Selecciona otra cuenta predeterminada para la misma moneda y uso antes de desactivar esta cuenta",
      );
    }

    await this.accountRepo.setActive(input.id, input.isActive);
    return successResponse("Estado de cuenta de tesoreria actualizado correctamente");
  }
}
