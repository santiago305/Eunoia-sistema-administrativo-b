import { BadRequestException, Inject } from "@nestjs/common";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WarehouseLocation } from "src/modules/warehouses/domain/entities/warehouse-location";
import { CreateLocationInput } from "../../dtos/location/input/create.input";
import { LocationOutput } from "../../dtos/location/output/location.output";
import { LOCATION_REPOSITORY, LocartionRepository } from "../../ports/location.repository.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";

export class CreateLocationUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: CreateLocationInput, tx?: TransactionContext): Promise<LocationOutput> {
    const work = async (ctx: TransactionContext) => {
      const warehouse = await this.warehouseRepo.findById(input.warehouseId, ctx);
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

      const saved = await this.locationRepo.create(location, ctx);
      return {
        locationId: saved.locationId.value,
        warehouseId: saved.warehouseId.value,
        code: saved.code,
        description: saved.description,
        isActive: saved.isActive,
      };
    };
    if (tx) {
      return work(tx);
    }
    return this.uow.runInTransaction(work);
  }
}
