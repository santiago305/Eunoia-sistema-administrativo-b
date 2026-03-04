import { Inject, NotFoundException } from "@nestjs/common";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { GetCreditQuotaInput } from "../../dtos/credit-quota/input/get-by-id.input";
import { CreditQuotaOutput } from "../../dtos/credit-quota/output/credit-quota.output";

export class GetCreditQuotaUsecase {
  constructor(
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(input: GetCreditQuotaInput): Promise<CreditQuotaOutput> {
    const quota = await this.creditQuotaRepo.findById(input.quotaId);
    if (!quota) {
      throw new NotFoundException({
        type: "error",
        message: "Cuota no encontrada",
      });
    }

    return {
      quotaId: quota.quotaId,
      number: quota.number,
      expirationDate: quota.expirationDate,
      paymentDate: quota.paymentDate,
      totalToPay: quota.totalToPay,
      totalPaid: quota.totalPaid,
      createdAt: quota.createdAt,
    };
  }
}
