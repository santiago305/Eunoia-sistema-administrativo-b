import { Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { errorResponse } from "src/shared/response-standard/response";
import { CompanyOutput } from "../dtos/company/output/company.output";
import { CompanyOutputMapper } from "../mappers/company-output.mapper";

export class GetCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
  ) {}

  async execute(): Promise<CompanyOutput> {
    const company = await this.companyRepo.findSingle();
    if (!company) {
      throw new NotFoundException(errorResponse("Empresa no encontrada"));
    }

    return CompanyOutputMapper.toOutput(company);
  }
}
