import { Inject } from "@nestjs/common";
import { ListLocationsInput } from "../../dtos/location/input/list.input";
import { LocationOutput } from "../../dtos/location/output/location.output";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { LOCATION_REPOSITORY, LocartionRepository } from "../../ports/location.repository.port";
import { WarehouseOutputMapper } from "../../mappers/warehouse-output.mapper";


export class ListLocationsUsecase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: ListLocationsInput): Promise<PaginatedResult<LocationOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.locationRepo.list({
      warehouseId: input.warehouseId,
      code: input.code,
      description: input.description,
      q: input.q,
      isActive: input.isActive,
      page,
      limit,
    });

    return {
      items: items.map((location) => WarehouseOutputMapper.toLocationOutput(location)),
      total,
      page,
      limit,
    };
  }
}
