import { Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CompanyOutput } from "../dtos/company/output/company.output";
import { CompanyNotFoundApplicationError } from "../errors/company-not-found.error";
import { CompanyOutputMapper } from "../mappers/company-output.mapper";

export class GetCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
  ) {}

  async execute(): Promise<CompanyOutput> {
    const company = await this.companyRepo.findSingle();
    if (!company) {
      throw new NotFoundException(new CompanyNotFoundApplicationError().message);
    }

    return CompanyOutputMapper.toOutput(company);
  }
}
