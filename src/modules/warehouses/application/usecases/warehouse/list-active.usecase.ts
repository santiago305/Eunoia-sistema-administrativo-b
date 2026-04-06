import { Inject } from "@nestjs/common";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";
import { WarehouseOutputMapper } from "../../mappers/warehouse-output.mapper";

export class ListActiveWarehousesUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(): Promise<WarehouseOutput[]> {
    const items = await this.warehouseRepo.listActive();
    return items.map((warehouse) => WarehouseOutputMapper.toWarehouseOutput(warehouse));
  }
}
