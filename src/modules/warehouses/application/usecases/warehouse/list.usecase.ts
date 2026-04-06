import { Inject } from "@nestjs/common";
import { ListWarehousesInput } from "../../dtos/warehouse/input/list.input";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";
import { WarehouseOutputMapper } from "../../mappers/warehouse-output.mapper";


export class ListWarehousesUsecase {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: ListWarehousesInput): Promise<PaginatedResult<WarehouseOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.warehouseRepo.list({
      name: input.name,
      department: input.department,
      province: input.province,
      district: input.district,
      address: input.address,
      isActive: input.isActive,
      q: input.q,
      page,
      limit,
    });

    return {
      items: items.map((warehouse) => WarehouseOutputMapper.toWarehouseOutput(warehouse)),
      total,
      page,
      limit,
    };
  }
}
