import { Inject, NotFoundException } from "@nestjs/common";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { GetAgencyInput } from "../../dtos/agency/input/get-by-id.input";
import { AgencyDetailOutput } from "../../dtos/agency/output/agency-detail.output";
import { AgencyOutputMapper } from "../../mappers/agency-output.mapper";
import { AgencyNotFoundError } from "../../errors/agency-not-found.error";

export class GetAgencyUsecase {
  constructor(
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
  ) {}

  async execute(input: GetAgencyInput): Promise<AgencyDetailOutput> {
    const agency = await this.agencyRepo.findById(input.agencyId);
    if (!agency) {
      throw new NotFoundException(new AgencyNotFoundError().message);
    }

    return {
      ...AgencyOutputMapper.toOutput(agency),
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    };
  }
}
