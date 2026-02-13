// src/modules/warehouses/application/usecases/warehouse/create.usecase.ts
import { Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { CreateWarehouseInput } from "../../dtos/warehouse/input/create.input";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";

export class CreateWarehouseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateWarehouseInput): Promise<WarehouseOutput> {
    return this.uow.runInTransaction(async (tx) => {
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

      const saved = await this.warehouseRepo.create(warehouse, tx);

      return {
        warehouseId: saved.warehouseId.value,
        name: saved.name,
        department: saved.department,
        province: saved.province,
        district: saved.district,
        address: saved.address,
        isActive: saved.isActive,
        createdAt: saved.createdAt,
      };
    });
  }
}
