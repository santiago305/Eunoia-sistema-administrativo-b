import { BadRequestException, Inject } from "@nestjs/common";
import { GetWarehouseInput } from "../../dtos/warehouse/input/get-by-id.input";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";

export class GetWarehouseUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: GetWarehouseInput): Promise<WarehouseOutput> {
    const warehouse = await this.warehouseRepo.findById(input.warehouseId);
    if (!warehouse) {
      throw new BadRequestException("Almacen no encontrado");
    }

    return {
      warehouseId: warehouse.warehouseId.value,
      name: warehouse.name,
      department: warehouse.department,
      province: warehouse.province,
      district: warehouse.district,
      address: warehouse.address,
      isActive: warehouse.isActive,
      createdAt: warehouse.createdAt,
    };
  }
}
