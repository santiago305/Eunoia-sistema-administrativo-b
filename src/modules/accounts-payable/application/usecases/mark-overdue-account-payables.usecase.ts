import { Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { ACCOUNT_PAYABLE_REPOSITORY, AccountPayableRepository } from "../../domain/ports/account-payable.repository";

export class MarkOverdueAccountPayablesUsecase {
  constructor(
    @Inject(ACCOUNT_PAYABLE_REPOSITORY)
    private readonly repo: AccountPayableRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(tx?: any) {
    const updated = await this.repo.markOverdue(this.clock.now(), tx);
    return { updated };
  }
}

