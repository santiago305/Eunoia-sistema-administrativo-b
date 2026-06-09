import { randomUUID } from "crypto";
import { InvalidAgencyError } from "../errors/invalid-agency.error";
import { AgencyDomainService } from "../services/agency-domain.service";
import { AgencyId } from "../value-objects/agency-id.vo";
import { SubsidiaryId } from "../value-objects/subsidiary-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";

export class Subsidiary {
  private constructor(
    public readonly subsidiaryId: SubsidiaryId,
    public readonly agencyId: AgencyId,
    public readonly alias: string,
    public readonly departmentId: UbigeoDepartmentId,
    public readonly provinceId: UbigeoProvinceId,
    public readonly districtId: UbigeoDistrictId,
    public readonly address: string | undefined,
    public readonly basePrice: number,
    public readonly note: string | undefined,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    subsidiaryId?: SubsidiaryId;
    agencyId: AgencyId;
    alias: string;
    departmentId: UbigeoDepartmentId;
    provinceId: UbigeoProvinceId;
    districtId: UbigeoDistrictId;
    address?: string;
    basePrice?: number;
    note?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const alias = params.alias?.trim();
    if (!alias) {
      throw new InvalidAgencyError("El alias de la sucursal es invalido");
    }

    const basePrice = params.basePrice ?? 0;
    if (basePrice < 0) {
      throw new InvalidAgencyError("El precio base no puede ser negativo");
    }

    return new Subsidiary(
      params.subsidiaryId ?? new SubsidiaryId(randomUUID()),
      params.agencyId,
      alias,
      params.departmentId,
      params.provinceId,
      params.districtId,
      AgencyDomainService.normalizeOptionalText(params.address),
      basePrice,
      AgencyDomainService.normalizeOptionalText(params.note),
      params.isActive ?? true,
      params.createdAt,
      params.updatedAt,
    );
  }
}
