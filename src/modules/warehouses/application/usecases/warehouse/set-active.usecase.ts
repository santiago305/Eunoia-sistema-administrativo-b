import { Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SetActiveWarehouse } from "../../dtos/warehouse/input/set-active.input";
import { LOCATION_REPOSITORY, LocartionRepository } from "../../ports/location.repository.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";

export class SetWarehouseActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: SetActiveWarehouse): Promise<{ type: string, message:string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.warehouseRepo.setActive(input.warehouseId, input.isActive, tx);
      await this.locationRepo.setActiveByWarehouseId(input.warehouseId, input.isActive, tx);
      return { 
        type: 'success',
        message: "¡Operacion realizada con exito!" 
      };
    });
  }
}
