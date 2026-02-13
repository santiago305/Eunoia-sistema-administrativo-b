import { Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { LOCATION_REPOSITORY, LocartionRepository } from "src/modules/warehouses/domain/ports/location.repository.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { SetActiveWarehouse } from "../../dtos/warehouse/input/set-active.input";

export class SetWarehouseActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: SetActiveWarehouse): Promise<{ status: string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.warehouseRepo.setActive(input.warehouseId, input.isActive, tx);
      await this.locationRepo.setActiveByWarehouseId(input.warehouseId, input.isActive, tx);
      return { status: "¡Operacion realizada con exito!" };
    });
  }
}
