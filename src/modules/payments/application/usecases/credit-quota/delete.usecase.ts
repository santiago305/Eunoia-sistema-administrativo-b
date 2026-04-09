import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CreditQuotaNotFoundError } from "../../errors/credit-quota-not-found.error";

export class DeleteCreditQuotaUsecase {
  constructor(
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(quotaId: string): Promise<{ type: string; message: string }> {
    const existing = await this.creditQuotaRepo.findById(quotaId);
    if (!existing) {
      throw new NotFoundException(new CreditQuotaNotFoundError().message);
    }

    try {
      await this.creditQuotaRepo.deleteById(quotaId);
    } catch {
      throw new BadRequestException("No se pudo eliminar la cuota");
    }

    return { type: "success", message: "Cuota eliminada con exito" };
  }
}
