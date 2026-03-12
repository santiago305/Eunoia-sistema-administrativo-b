import { Inject, NotFoundException } from "@nestjs/common";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CompanyOutput } from "../../dtos/company/output/company.output";
import { errorResponse } from "src/shared/response-standard/response";

export class GetCompanyUsecase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
  ) {}

  async execute(): Promise<CompanyOutput> {
    const row = await this.companyRepo.findSingle();
    if (!row) {
      throw new NotFoundException(errorResponse("Empresa no encontrada"));
    }

    return {
      companyId: row.companyId!,
      name: row.name,
      ruc: row.ruc,
      ubigeo: row.ubigeo,
      department: row.department,
      province: row.province,
      district: row.district,
      urbanization: row.urbanization,
      address: row.address,
      phone: row.phone,
      email: row.email,
      codLocal: row.codLocal,
      solUser: row.solUser,
      solPass: row.solPass,
      logoPath: row.logoPath,
      certPath: row.certPath,
      production: row.production,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

}
