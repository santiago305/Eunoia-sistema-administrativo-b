import "reflect-metadata";
import { Client } from "./client";
import { ClientDocType } from "../object-values/client-doc-type";
import { ClientType } from "../object-values/client-type";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";
import { InvalidClientError } from "../errors/invalid-client.error";

describe("Client", () => {
  const base = {
    type: ClientType.NEW,
    fullName: "Juan Perez",
    docType: ClientDocType.DNI,
    docNumber: "12345678",
    departmentId: new UbigeoDepartmentId("15"),
    provinceId: new UbigeoProvinceId("1501"),
    districtId: new UbigeoDistrictId("150101"),
  };

  it("rejects empty fullName", () => {
    expect(() => Client.create({ ...base, fullName: "   " })).toThrow(InvalidClientError);
  });

  it("rejects empty docNumber", () => {
    expect(() => Client.create({ ...base, docNumber: "   " })).toThrow(InvalidClientError);
  });

  it("accepts docType=NONE with empty docNumber and non-empty reference", () => {
    const client = Client.create({
      ...base,
      docType: ClientDocType.NONE,
      docNumber: "",
      reference: "Cliente sin documento - feria",
    });

    expect(client.docType).toBe(ClientDocType.NONE);
    expect(client.docNumber).toBe("");
    expect(client.reference).toBe("Cliente sin documento - feria");
  });

  it("accepts docType=NONE with empty reference", () => {
    const client = Client.create({
      ...base,
      docType: ClientDocType.NONE,
      docNumber: "",
      reference: "   ",
    });

    expect(client.docType).toBe(ClientDocType.NONE);
    expect(client.docNumber).toBe("");
    expect(client.reference).toBeUndefined();
  });
});
