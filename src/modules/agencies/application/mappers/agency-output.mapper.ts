import { Agency } from "src/modules/agencies/domain/entities/agency";
import { Subsidiary } from "src/modules/agencies/domain/entities/subsidiary";
import { AgencyOutput } from "../dtos/agency/output/agency.output";
import { SubsidiaryOutput } from "../dtos/agency/output/subsidiary.output";

export class AgencyOutputMapper {
  static toOutput(agency: Agency, subsidiaries?: Subsidiary[]): AgencyOutput {
    return {
      id: agency.agencyId.value,
      name: agency.name,
      description: agency.description,
      isActive: agency.isActive,
      subsidiaryCount: subsidiaries?.length,
      subsidiaries: subsidiaries?.map((subsidiary) => this.toSubsidiaryOutput(subsidiary)),
    };
  }

  static toSubsidiaryOutput(subsidiary: Subsidiary): SubsidiaryOutput {
    return {
      id: subsidiary.subsidiaryId.value,
      agencyId: subsidiary.agencyId.value,
      alias: subsidiary.alias,
      departmentId: subsidiary.departmentId.value,
      provinceId: subsidiary.provinceId.value,
      districtId: subsidiary.districtId.value,
      address: subsidiary.address,
      basePrice: subsidiary.basePrice,
      note: subsidiary.note,
      generatesPayable: subsidiary.generatesPayable,
      payableSupplierId: subsidiary.payableSupplierId ?? null,
      payableDescription: subsidiary.payableDescription ?? null,
      isActive: subsidiary.isActive,
    };
  }
}

