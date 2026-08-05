import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { WarehouseOutputMapper } from "../../mappers/warehouse-output.mapper";

export class SetProductionDefaultWarehouseUsecase {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY) private readonly warehouseRepo: WarehouseRepository) {}

  execute(id: string) {
    return this.uow.runInTransaction(async (tx) => {
      const warehouseId = new WarehouseId(id);
      const warehouse = await this.warehouseRepo.findById(warehouseId, tx);
      if (!warehouse) throw new NotFoundException("Almacen no encontrado");
      if (!warehouse.isActive) throw new BadRequestException("Solo un almacen activo puede ser predeterminado para produccion");
      await this.warehouseRepo.setProductionDefault(warehouseId, tx);
      const updated = await this.warehouseRepo.findById(warehouseId, tx);
      return WarehouseOutputMapper.toWarehouseOutput(updated!);
    });
  }
}
