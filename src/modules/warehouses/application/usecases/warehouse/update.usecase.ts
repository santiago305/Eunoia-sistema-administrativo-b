// src/modules/warehouses/application/usecases/warehouse/update.usecase.ts
import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { UpdateWarehouseInput } from "../../dtos/warehouse/input/update.input";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";

export class UpdateWarehouseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: UpdateWarehouseInput): Promise<WarehouseOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const warehouseActive = await this.warehouseRepo.findById(input.warehouseId);

      if(!warehouseActive.isActive){
        throw new BadRequestException("No puedes actulizar un almacen desabilitado");
      }
      
      const updated = await this.warehouseRepo.update(
        {
          warehouseId: input.warehouseId,
          name: input.name,
          department: input.department,
          province: input.province,
          district: input.district,
          address: input.address,
        },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("Almacen no encontrado");
      }

      return {
        warehouseId: updated.warehouseId.value,
        name: updated.name,
        department: updated.department,
        province: updated.province,
        district: updated.district,
        address: updated.address,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
      };
    });
  }
}
