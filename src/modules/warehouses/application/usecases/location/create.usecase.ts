import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { LOCATION_REPOSITORY, LocartionRepository } from "src/modules/warehouses/domain/ports/location.repository.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { WarehouseLocation } from "src/modules/warehouses/domain/entities/warehouse-location";
import { CreateLocationInput } from "../../dtos/location/input/create.input";
import { LocationOutput } from "../../dtos/location/output/location.output";

export class CreateLocationUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: CreateLocationInput): Promise<LocationOutput> {
    return this.uow.runInTransaction(async (tx) => {
      
      const warehouse = await this.warehouseRepo.findById(input.warehouseId, tx);
      if (!warehouse) {
        throw new BadRequestException("Almacen no encontrado");
      }
      if (!warehouse.isActive) {
        throw new BadRequestException("Almacen inactivo");
      }
      const location = new WarehouseLocation(
        undefined,
        input.warehouseId,
        input.code,
        input.description,
      );

      const saved = await this.locationRepo.create(location, tx);
      return {
        locationId: saved.locationId.value,
        warehouseId: saved.warehouseId.value,
        code: saved.code,
        description: saved.description,
        isActive: saved.isActive,
      };
    });
  }
}
