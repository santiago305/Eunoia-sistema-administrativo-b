import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { CreateTelephoneUsecase } from "./create.usecase";
import { Client } from "src/modules/clients/domain/entities/client";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { UbigeoDepartmentId } from "src/modules/clients/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/clients/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/clients/domain/value-objects/ubigeo-district-id.vo";

describe("CreateTelephoneUsecase", () => {
  it("unsets existing main when creating isMain=true", async () => {
    const client = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });

    const clientRepo = { findById: jest.fn().mockResolvedValue(client) };
    const telRepo = {
      unsetMainByClientId: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateTelephoneUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateTelephoneUsecase);

      await usecase.execute({ clientId: client.clientId.value, number: "999999999", isMain: true });

      expect(telRepo.unsetMainByClientId).toHaveBeenCalledWith(
        client.clientId.value,
        expect.anything(),
      );
      expect(telRepo.create).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
