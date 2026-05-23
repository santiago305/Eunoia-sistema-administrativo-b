import { Agency } from "src/modules/agencies/domain/entities/agency";
import { AgencyOutput } from "../dtos/agency/output/agency.output";

export class AgencyOutputMapper {
  static toOutput(agency: Agency): AgencyOutput {
    return {
      id: agency.agencyId.value,
      name: agency.name,
      reference: agency.reference,
      address: agency.address,
      departmentId: agency.departmentId.value,
      provinceId: agency.provinceId.value,
      districtId: agency.districtId.value,
      isActive: agency.isActive,
    };
  }
}

