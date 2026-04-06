import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SetActiveWarehouse } from "../../dtos/warehouse/input/set-active.input";
import { LOCATION_REPOSITORY, LocartionRepository } from "../../ports/location.repository.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";
import { WarehouseNotFoundError } from "../../errors/warehouse-not-found.error";

export class SetWarehouseActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: SetActiveWarehouse): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const warehouse = await this.warehouseRepo.findById(input.warehouseId, tx);

      if (!warehouse) {
        throw new NotFoundException(new WarehouseNotFoundError().message);
      }

      await this.warehouseRepo.setActive(input.warehouseId, input.isActive, tx);
      await this.locationRepo.setActiveByWarehouseId(input.warehouseId, input.isActive, tx);

      return { message: "Operacion realizada con exito" };
    });
  }
}
