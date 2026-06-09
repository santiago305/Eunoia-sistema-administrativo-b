import { Inject, NotFoundException } from "@nestjs/common";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { AgencyOutput } from "../../dtos/agency/output/agency.output";
import { AgencyNotFoundError } from "../../errors/agency-not-found.error";
import { AgencyOutputMapper } from "../../mappers/agency-output.mapper";

export class GetAgencyWithSubsidiariesUsecase {
  constructor(
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
  ) {}

  async execute(input: { agencyId: string }): Promise<AgencyOutput> {
    const found = await this.agencyRepo.findByIdWithSubsidiaries(input.agencyId, {
      includeInactiveSubsidiaries: true,
    });

    if (!found) {
      throw new NotFoundException(new AgencyNotFoundError().message);
    }

    return AgencyOutputMapper.toOutput(found.agency, found.subsidiaries);
  }
}
