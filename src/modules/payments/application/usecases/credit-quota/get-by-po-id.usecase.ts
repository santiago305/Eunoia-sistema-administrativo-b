import { Inject } from "@nestjs/common";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { GetCreditQuotasByPoIdInput } from "../../dtos/credit-quota/input/get-by-po-id.input";
import { CreditQuotaOutput } from "../../dtos/credit-quota/output/credit-quota.output";
import { CreditQuotaOutputMapper } from "../../mappers/credit-quota-output.mapper";

export class GetCreditQuotasByPoIdUsecase {
  constructor(
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(input: GetCreditQuotasByPoIdInput): Promise<CreditQuotaOutput[]> {
    const items = await this.creditQuotaRepo.findByPoId(input.poId);

    return items.map((row) => CreditQuotaOutputMapper.toOutput(row));
  }
}
