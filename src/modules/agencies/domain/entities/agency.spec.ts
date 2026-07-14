import { Agency } from "./agency";
import { Subsidiary } from "./subsidiary";
import { AgencyId } from "../value-objects/agency-id.vo";
import { SubsidiaryId } from "../value-objects/subsidiary-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";

describe("Agency subsidiaries domain", () => {
  it("creates an agency header without location fields", () => {
    const agency = Agency.create({ name: "Shalom", isActive: true });

    expect(agency.name).toBe("Shalom");
    expect(agency.isActive).toBe(true);
    expect((agency as any).address).toBeUndefined();
    expect((agency as any).departmentId).toBeUndefined();
  });

  it("creates and updates an agency nullable description", () => {
    const agency = Agency.create({
      name: "Shalom",
      description: "  Agencia principal  ",
      isActive: true,
    });

    expect(agency.description).toBe("Agencia principal");

    const cleared = agency.update({ description: null });
    expect(cleared.description).toBeNull();
  });

  it("creates a subsidiary with ubigeo, address, base price and note", () => {
    const agencyId = new AgencyId("11111111-1111-4111-8111-111111111111");
    const subsidiary = Subsidiary.create({
      subsidiaryId: new SubsidiaryId("22222222-2222-4222-8222-222222222222"),
      agencyId,
      alias: "Lima Centro",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      address: "Av. Peru 123",
      basePrice: 12.5,
      note: "Entrega regular",
      isActive: true,
    });

    expect(subsidiary.agencyId.value).toBe(agencyId.value);
    expect(subsidiary.alias).toBe("Lima Centro");
    expect(subsidiary.basePrice).toBe(12.5);
  });

  it("rejects a negative subsidiary base price", () => {
    expect(() =>
      Subsidiary.create({
        agencyId: new AgencyId("11111111-1111-4111-8111-111111111111"),
        alias: "Lima Centro",
        departmentId: new UbigeoDepartmentId("15"),
        provinceId: new UbigeoProvinceId("1501"),
        districtId: new UbigeoDistrictId("150101"),
        basePrice: -1,
      }),
    ).toThrow("El precio base no puede ser negativo");
  });
});
