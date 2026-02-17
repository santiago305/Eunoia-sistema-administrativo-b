import { BadRequestException, Inject } from "@nestjs/common";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { GetWarehouseWithLocationsInput } from "../../dtos/warehouse/input/get-with-locations.input";
import { WarehouseWithLocationsOutput } from "../../dtos/warehouse/output/warehouse-with-locations.out";

export class GetWarehouseWithLocationsUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: GetWarehouseWithLocationsInput): Promise<WarehouseWithLocationsOutput> {
    const result = await this.warehouseRepo.findByIdLocations(input.warehouseId);
    if (!result) {
      throw new BadRequestException("Almacen no encontrado");
    }

    const warehouse = result.warehouse;
    const locations = result.items;

    return {
      locations: locations.map((l) => ({
        locationId: l.locationId.value,
        code: l.code,
        description: l.description ?? ""
      })),
    };
  }
}
