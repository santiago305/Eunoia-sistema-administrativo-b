import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { SetAgencyActiveInput } from "../../dtos/agency/input/set-active.input";
import { AgencyNotFoundError } from "../../errors/agency-not-found.error";

export class SetAgencyActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
  ) {}

  async execute(input: SetAgencyActiveInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.agencyRepo.findById(input.agencyId, tx);
      if (!current) {
        throw new NotFoundException(new AgencyNotFoundError().message);
      }

      try {
        await this.agencyRepo.setActive(input.agencyId, input.isActive, tx);
      } catch {
        throw new BadRequestException("No se pudo actualizar el estado de la agencia");
      }

      return { message: "Estado de la agencia actualizado" };
    });
  }
}

