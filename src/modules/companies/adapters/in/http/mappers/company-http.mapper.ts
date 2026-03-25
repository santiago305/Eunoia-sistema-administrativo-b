import { CreateCompanyInput } from "src/modules/companies/application/dtos/company/input/create.input";
import { UpdateCompanyInput } from "src/modules/companies/application/dtos/company/input/update.input";
import { HttpCreateCompanyDto } from "../dtos/http-company-create.dto";
import { HttpUpdateCompanyDto } from "../dtos/http-company-update.dto";

export class CompanyHttpMapper {
  static toCreateInput(dto: HttpCreateCompanyDto): CreateCompanyInput {
    return {
      name: dto.name?.trim(),
      ruc: dto.ruc?.trim(),
      ubigeo: dto.ubigeo?.trim() || undefined,
      department: dto.department?.trim() || undefined,
      province: dto.province?.trim() || undefined,
      district: dto.district?.trim() || undefined,
      urbanization: dto.urbanization?.trim() || undefined,
      address: dto.address?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      email: dto.email?.trim().toLowerCase() || undefined,
      codLocal: dto.codLocal?.trim() || undefined,
      solUser: dto.solUser?.trim() || undefined,
      solPass: dto.solPass?.trim() || undefined,
      production: dto.production,
      isActive: dto.isActive,
    };
  }

  static toUpdateInput(dto: HttpUpdateCompanyDto): UpdateCompanyInput {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.ruc !== undefined ? { ruc: dto.ruc.trim() } : {}),
      ...(dto.ubigeo !== undefined ? { ubigeo: dto.ubigeo.trim() || undefined } : {}),
      ...(dto.department !== undefined ? { department: dto.department.trim() || undefined } : {}),
      ...(dto.province !== undefined ? { province: dto.province.trim() || undefined } : {}),
      ...(dto.district !== undefined ? { district: dto.district.trim() || undefined } : {}),
      ...(dto.urbanization !== undefined
        ? { urbanization: dto.urbanization.trim() || undefined }
        : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() || undefined } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() || undefined } : {}),
      ...(dto.email !== undefined
        ? { email: dto.email.trim().toLowerCase() || undefined }
        : {}),
      ...(dto.codLocal !== undefined ? { codLocal: dto.codLocal.trim() || undefined } : {}),
      ...(dto.solUser !== undefined ? { solUser: dto.solUser.trim() || undefined } : {}),
      ...(dto.solPass !== undefined ? { solPass: dto.solPass.trim() || undefined } : {}),
      ...(dto.production !== undefined ? { production: dto.production } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }
}