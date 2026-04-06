import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { ListCreditQuotasInput } from "../../dtos/credit-quota/input/list.input";
import { CreditQuotaOutput } from "../../dtos/credit-quota/output/credit-quota.output";
import { CreditQuotaOutputMapper } from "../../mappers/credit-quota-output.mapper";

export class ListCreditQuotasUsecase {
  constructor(
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(input: ListCreditQuotasInput): Promise<PaginatedResult<CreditQuotaOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.creditQuotaRepo.list({
      poId: input.poId,
      page,
      limit,
    });

    return {
      items: items.map((row) => CreditQuotaOutputMapper.toOutput(row)),
      total,
      page,
      limit,
    };
  }
}
