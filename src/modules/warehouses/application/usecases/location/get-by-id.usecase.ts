import { BadRequestException, Inject } from "@nestjs/common";
import { LOCATION_REPOSITORY, LocartionRepository } from "src/modules/warehouses/domain/ports/location.repository.port";
import { GetByIdInput } from "../../dtos/location/input/get-by-id.input";
import { LocationOutput } from "../../dtos/location/output/location.output";

export class GetLocationUsecase {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: GetByIdInput): Promise<LocationOutput> {
    const location = await this.locationRepo.findById(input.locationId);
    if (!location) {
      throw new BadRequestException("Ubicacion no encontrada");
    }

    return {
      locationId: location.locationId.value,
      warehouseId: location.warehouseId.value,
      code: location.code,
      description: location.description,
      isActive: location.isActive,
    };
  }
}
