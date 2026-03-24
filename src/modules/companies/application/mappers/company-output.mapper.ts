import { Company } from "src/modules/companies/domain/entity/company";
import { CompanyOutput } from "../dtos/company/output/company.output";

export class CompanyOutputMapper {
  static toOutput(company: Company): CompanyOutput {
    return {
      companyId: company.companyId!,
      name: company.name,
      ruc: company.ruc,
      ubigeo: company.ubigeo,
      department: company.department,
      province: company.province,
      district: company.district,
      urbanization: company.urbanization,
      address: company.address,
      phone: company.phone,
      email: company.email,
      codLocal: company.codLocal,
      solUser: company.solUser,
      logoPath: company.logoPath,
      certPath: company.certPath,
      production: company.production,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
