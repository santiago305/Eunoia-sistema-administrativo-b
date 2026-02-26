import { Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { LOCATION_REPOSITORY, LocartionRepository } from "src/modules/warehouses/domain/ports/location.repository.port";
import { SetActiveInput } from "../../dtos/location/input/set-active.input";

export class SetLocationActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: SetActiveInput): Promise<{ status: string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.locationRepo.setActive(input.locationId, input.isActive, tx);
      return { status: "Operacion realizada" };
    });
  }
}
