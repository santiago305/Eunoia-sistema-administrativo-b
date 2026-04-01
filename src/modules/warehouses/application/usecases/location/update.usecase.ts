import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UpdateLocationInput } from "../../dtos/location/input/update.input";
import { LocationOutput } from "../../dtos/location/output/location.output";
import { LOCATION_REPOSITORY, LocartionRepository } from "../../ports/location.repository.port";

export class UpdateLocationUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocartionRepository,
  ) {}

  async execute(input: UpdateLocationInput): Promise<LocationOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const validateActived = await this.locationRepo.findById(input.locationId)

      if(!validateActived.isActive){
        throw new BadRequestException('No puedes actualiza un registro deshabilitado')
      }

      const updated = await this.locationRepo.update(
        {
          locationId: input.locationId,
          warehouseId: input.warehouseId,
          code: input.code,
          description: input.description,
        },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("Ubicacion no encontrada");
      }

      return {
        locationId: updated.locationId.value,
        warehouseId: updated.warehouseId.value,
        code: updated.code,
        description: updated.description,
        isActive: updated.isActive,
      };
    });
  }
}
