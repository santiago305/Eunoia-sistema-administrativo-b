import { BadRequestException, Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { CreateWarehouseInput } from "../../dtos/warehouse/input/create.input";

export class CreateWarehouseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateWarehouseInput): Promise<{message:string, type:string}> {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.warehouseRepo.findByName(input.name, tx);
      if (existing) {
        throw new BadRequestException({ type: "error", message: "Ya existe un almacén con ese nombre" });
      }

      const warehouse = new Warehouse(
        undefined,
        input.name,
        input.department,
        input.province,
        input.district,
        input.address,
        true,
        this.clock.now(),
      );
      try {
        await this.warehouseRepo.create(warehouse, tx);
      } catch {
        throw new BadRequestException({ type: "error", message: "No se pudo crear el almacen" });
      }

      return {
        message: "¡Varitante create con exito!",
        type: "success"
      };
    });
  }
}
