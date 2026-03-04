import { Inject } from "@nestjs/common";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";

export class ListActiveWarehousesUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(): Promise<WarehouseOutput[]> {
    const items = await this.warehouseRepo.listActive();
    return items.map((w: any) => ({
      warehouseId: w.warehouseId.value,
      name: w.name,
      department: w.department,
      province: w.province,
      district: w.district,
      address: w.address,
      isActive: w.isActive ?? true,
      createdAt: w.createdAt,
    }));
  }
}
