import "reflect-metadata";
import { UbigeoDepartmentId } from "./ubigeo-department-id.vo";
import { UbigeoProvinceId } from "./ubigeo-province-id.vo";
import { UbigeoDistrictId } from "./ubigeo-district-id.vo";
import { InvalidClientError } from "../errors/invalid-client.error";

describe("UbigeoId VOs", () => {
  it("rejects invalid department length", () => {
    expect(() => new UbigeoDepartmentId("1")).toThrow(InvalidClientError);
  });

  it("rejects invalid province length", () => {
    expect(() => new UbigeoProvinceId("150")).toThrow(InvalidClientError);
  });

  it("rejects invalid district length", () => {
    expect(() => new UbigeoDistrictId("15010")).toThrow(InvalidClientError);
  });
});

