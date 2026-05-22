import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { GetClientUsecase } from "./get-by-id.usecase";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { Client } from "src/modules/clients/domain/entities/client";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { UbigeoDepartmentId } from "src/modules/clients/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/clients/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/clients/domain/value-objects/ubigeo-district-id.vo";
import { Telephone } from "src/modules/clients/domain/entities/telephone";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";

describe("GetClientUsecase (detail)", () => {
  it("returns client with telephones", async () => {
    const clientId = "35d5a78d-285a-4106-b587-5c6b9e7c515b";
    const createdAt = new Date("2026-05-22T00:00:00.000Z");
    const updatedAt = new Date("2026-05-22T01:00:00.000Z");

    const client = Client.create({
      type: ClientType.UNDEFINED,
      fullName: "Derbys Manuel",
      docType: ClientDocType.DNI,
      docNumber: "DDEDEDEDED",
      departmentId: new UbigeoDepartmentId("02"),
      provinceId: new UbigeoProvinceId("0201"),
      districtId: new UbigeoDistrictId("020102"),
      address: "MZ. MZ F1 LOTE",
      isActive: true,
      createdAt,
      updatedAt,
    });

    const clientRepo = {
      findById: jest.fn().mockResolvedValue(client),
    };

    const telephoneRepo = {
      listByClientId: jest.fn().mockResolvedValue([
        Telephone.create({
          clientId: new ClientId(clientId),
          number: "999999999",
          isMain: true,
        }),
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetClientUsecase,
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(GetClientUsecase);
      const result = await usecase.execute({ clientId });

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fullName: "Derbys Manuel",
          telephones: [
            expect.objectContaining({
              number: "999999999",
              isMain: true,
              clientId,
            }),
          ],
        }),
      );
      expect(result.createdAt?.toISOString()).toBe(createdAt.toISOString());
      expect(result.updatedAt?.toISOString()).toBe(updatedAt.toISOString());

      expect(clientRepo.findById).toHaveBeenCalledWith(clientId);
      expect(telephoneRepo.listByClientId).toHaveBeenCalledWith(clientId);
    } finally {
      await moduleRef.close();
    }
  });

  it("keeps 404 when client does not exist", async () => {
    const clientRepo = { findById: jest.fn().mockResolvedValue(null) };
    const telephoneRepo = { listByClientId: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetClientUsecase,
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(GetClientUsecase);
      await expect(usecase.execute({ clientId: "missing" })).rejects.toBeInstanceOf(NotFoundException);
      expect(telephoneRepo.listByClientId).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
