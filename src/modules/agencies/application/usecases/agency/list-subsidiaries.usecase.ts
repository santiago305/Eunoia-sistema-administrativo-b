import { Inject } from "@nestjs/common";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { ListSubsidiariesInput } from "../../dtos/agency/input/list-subsidiaries.input";
import { SubsidiaryOutput } from "../../dtos/agency/output/subsidiary.output";
import { AgencyOutputMapper } from "../../mappers/agency-output.mapper";

export class ListSubsidiariesUsecase {
  constructor(
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
  ) {}

  async execute(input: ListSubsidiariesInput): Promise<SubsidiaryOutput[]> {
    const subsidiaries = await this.agencyRepo.listSubsidiaries(input);
    return subsidiaries.map((subsidiary) => AgencyOutputMapper.toSubsidiaryOutput(subsidiary));
  }
}
