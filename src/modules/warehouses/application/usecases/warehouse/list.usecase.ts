// src/modules/warehouses/application/usecases/warehouse/list.usecase.ts
import { Inject } from "@nestjs/common";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { ListWarehousesInput } from "../../dtos/warehouse/input/list.input";
import { WarehouseOutput } from "../../dtos/warehouse/output/warehouse.out";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";


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
      items: items.map((w: any) => ({
        warehouseId: w.warehouseId.value,
        name: w.name,
        department: w.department,
        province: w.province,
        district: w.district,
        address: w.address,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
