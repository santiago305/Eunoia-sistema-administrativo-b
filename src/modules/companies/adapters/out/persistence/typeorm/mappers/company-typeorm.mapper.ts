import { Company } from "src/modules/companies/domain/entity/company";
import { UpdateCompanyParams } from "src/modules/companies/domain/types/update-company.params";
import { CompanyEntity } from "../entities/company.entity";

export class CompanyTypeormMapper {
  private static readonly emptyPatch: Partial<CompanyEntity> = {};

  static toDomain(entity: CompanyEntity): Company {
    return Company.reconstitute({
      companyId: entity.id,
      name: entity.name,
      ruc: entity.ruc,
      ubigeo: entity.ubigeo ?? undefined,
      department: entity.department ?? undefined,
      province: entity.province ?? undefined,
      district: entity.district ?? undefined,
      urbanization: entity.urbanization ?? undefined,
      address: entity.address ?? undefined,
      phone: entity.phone ?? undefined,
      email: entity.email ?? undefined,
      codLocal: entity.codLocal ?? undefined,
      solUser: entity.solUser ?? undefined,
      solPass: entity.solPass ?? undefined,
      logoPath: entity.logoPath ?? undefined,
      certPath: entity.certPath ?? undefined,
      production: entity.production,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(company: Company): Partial<CompanyEntity> {
    return {
      id: company.companyId,
      name: company.name,
      ruc: company.ruc,
      ubigeo: company.ubigeo ?? null,
      department: company.department ?? null,
      province: company.province ?? null,
      district: company.district ?? null,
      urbanization: company.urbanization ?? null,
      address: company.address ?? null,
      phone: company.phone ?? null,
      email: company.email ?? null,
      codLocal: company.codLocal ?? null,
      solUser: company.solUser ?? null,
      solPass: company.solPass ?? null,
      logoPath: company.logoPath ?? null,
      certPath: company.certPath ?? null,
      production: company.production,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  static toUpdatePatch(
    params: UpdateCompanyParams & {
      createdAt?: Date;
      updatedAt?: Date;
    },
  ): Partial<CompanyEntity> {
    const patch: Partial<CompanyEntity> = { ...this.emptyPatch };

    if (params.name !== undefined) patch.name = params.name;
    if (params.ruc !== undefined) patch.ruc = params.ruc;
    if (params.ubigeo !== undefined) patch.ubigeo = params.ubigeo;
    if (params.department !== undefined) patch.department = params.department;
    if (params.province !== undefined) patch.province = params.province;
    if (params.district !== undefined) patch.district = params.district;
    if (params.urbanization !== undefined) patch.urbanization = params.urbanization;
    if (params.address !== undefined) patch.address = params.address;
    if (params.phone !== undefined) patch.phone = params.phone;
    if (params.email !== undefined) patch.email = params.email;
    if (params.codLocal !== undefined) patch.codLocal = params.codLocal;
    if (params.solUser !== undefined) patch.solUser = params.solUser;
    if (params.solPass !== undefined) patch.solPass = params.solPass;
    if (params.logoPath !== undefined) patch.logoPath = params.logoPath;
    if (params.certPath !== undefined) patch.certPath = params.certPath;
    if (params.production !== undefined) patch.production = params.production;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.createdAt !== undefined) patch.createdAt = params.createdAt;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    return patch;
  }
}
