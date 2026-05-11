import { Inject } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { successResponse } from "src/shared/response-standard/response";

export class GetCompanyBrandingUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
  ) {}

  async execute() {
    const company = await this.companyRepo.findSingle();

    return successResponse("Branding obtenido correctamente", {
      companyId: company?.companyId ?? null,
      name: company?.name ?? null,
      logoPath: company?.logoPath ?? null,
      isotypePath: company?.isotypePath ?? null,
    });
  }
}

