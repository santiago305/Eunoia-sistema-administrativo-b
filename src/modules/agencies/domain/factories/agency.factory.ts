import { Agency } from "../entities/agency";
import { Subsidiary } from "../entities/subsidiary";
import { AgencyId } from "../value-objects/agency-id.vo";
import { SubsidiaryId } from "../value-objects/subsidiary-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";

export class AgencyFactory {
  static createAgency(params: {
    agencyId?: AgencyId;
    name: string;
    isActive?: boolean;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return Agency.create(params);
  }

  static createSubsidiary(params: {
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
    return Subsidiary.create(params);
  }
}

