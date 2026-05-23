import { randomUUID } from "crypto";
import { InvalidAgencyError } from "../errors/invalid-agency.error";
import { AgencyDomainService } from "../services/agency-domain.service";
import { AgencyId } from "../value-objects/agency-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";

export class Agency {
  private constructor(
    public readonly agencyId: AgencyId,
    public readonly name: string,
    public readonly departmentId: UbigeoDepartmentId,
    public readonly provinceId: UbigeoProvinceId,
    public readonly districtId: UbigeoDistrictId,
    public readonly reference?: string,
    public readonly address?: string,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    agencyId?: AgencyId;
    name: string;
    reference?: string;
    address?: string;
    departmentId: UbigeoDepartmentId;
    provinceId: UbigeoProvinceId;
    districtId: UbigeoDistrictId;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const name = params.name?.trim();
    if (!name) {
      throw new InvalidAgencyError("El nombre es invalido");
    }

    return new Agency(
      params.agencyId ?? new AgencyId(randomUUID()),
      name,
      params.departmentId,
      params.provinceId,
      params.districtId,
      AgencyDomainService.normalizeOptionalText(params.reference),
      AgencyDomainService.normalizeOptionalText(params.address),
      params.isActive ?? true,
      params.createdAt,
      params.updatedAt,
    );
  }

  update(params: {
    name?: string;
    reference?: string;
    address?: string;
    departmentId?: UbigeoDepartmentId;
    provinceId?: UbigeoProvinceId;
    districtId?: UbigeoDistrictId;
    isActive?: boolean;
    updatedAt?: Date;
  }) {
    return Agency.create({
      agencyId: this.agencyId,
      name: params.name ?? this.name,
      reference: params.reference ?? this.reference,
      address: params.address ?? this.address,
      departmentId: params.departmentId ?? this.departmentId,
      provinceId: params.provinceId ?? this.provinceId,
      districtId: params.districtId ?? this.districtId,
      isActive: params.isActive ?? this.isActive,
      createdAt: this.createdAt,
      updatedAt: params.updatedAt ?? this.updatedAt,
    });
  }
}

