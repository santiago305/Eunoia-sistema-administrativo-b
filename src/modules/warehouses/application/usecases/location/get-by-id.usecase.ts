import { BadRequestException, Inject } from "@nestjs/common";
import { GetByIdInput } from "../../dtos/location/input/get-by-id.input";
import { LocationOutput } from "../../dtos/location/output/location.output";
import { LOCATION_REPOSITORY, LocartionRepository } from "../../ports/location.repository.port";

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
