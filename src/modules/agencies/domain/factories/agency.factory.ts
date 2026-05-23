import { Agency } from "../entities/agency";
import { AgencyId } from "../value-objects/agency-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";

export class AgencyFactory {
  static createAgency(params: {
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
    return Agency.create(params);
  }
}

