import { Agency } from "src/modules/agencies/domain/entities/agency";
import { Subsidiary } from "src/modules/agencies/domain/entities/subsidiary";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { SubsidiaryId } from "src/modules/agencies/domain/value-objects/subsidiary-id.vo";
import { UbigeoDepartmentId } from "src/modules/agencies/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoDistrictId } from "src/modules/agencies/domain/value-objects/ubigeo-district-id.vo";
import { UbigeoProvinceId } from "src/modules/agencies/domain/value-objects/ubigeo-province-id.vo";
import { AgencyOutputMapper } from "./agency-output.mapper";

describe("AgencyOutputMapper", () => {
  it("includes the total number of subsidiaries", () => {
    const agencyId = new AgencyId("11111111-1111-4111-8111-111111111111");
    const agency = Agency.create({ agencyId, name: "Shalom" });
    const subsidiary = Subsidiary.create({
      subsidiaryId: new SubsidiaryId("22222222-2222-4222-8222-222222222222"),
      agencyId,
      alias: "Lima Centro",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
    });

    expect(AgencyOutputMapper.toOutput(agency, [subsidiary]).subsidiaryCount).toBe(1);
  });
});
