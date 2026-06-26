import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UBIGEO_REPOSITORY } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { CLIENT_REALTIME } from "src/modules/clients/integration/client/ports/client-realtime.port";
import { UpdateClientUsecase } from "./update.usecase";
import { Client } from "src/modules/clients/domain/entities/client";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { UbigeoDepartmentId } from "src/modules/clients/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/clients/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/clients/domain/value-objects/ubigeo-district-id.vo";
import { BadRequestException } from "@nestjs/common";

describe("UpdateClientUsecase", () => {
  it("does not modify telephones when telephonesReplace is not provided", async () => {
    const current = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });

    const clientRepo = {
      findById: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue({}),
    };
    const ubigeoRepo = { findByDistrictCode: jest.fn() };
    const telRepo = {
      deleteByClientId: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telRepo },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REALTIME, useValue: { emitClientUpdated: jest.fn(), stream: jest.fn() } },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateClientUsecase);
      await usecase.execute({
        clientId: current.clientId.value,
        fullName: "Juan Perez 2",
      } as any);

      expect(telRepo.deleteByClientId).not.toHaveBeenCalled();
      expect(telRepo.create).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("requires all ubigeo fields if any is present", async () => {
    const current = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });

    const clientRepo = {
      findById: jest.fn().mockResolvedValue(current),
      update: jest.fn(),
    };
    const ubigeoRepo = { findByDistrictCode: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: {} },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REALTIME, useValue: { emitClientUpdated: jest.fn(), stream: jest.fn() } },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateClientUsecase);

      await expect(
        usecase.execute({
          clientId: current.clientId.value,
          departmentId: "15",
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(clientRepo.update).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("replaces telephones atomically with client", async () => {
    const current = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });

    const clientRepo = {
      findById: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue({}),
    };
    const ubigeoRepo = { findByDistrictCode: jest.fn() };
    const telRepo = {
      deleteByClientId: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telRepo },
        { provide: CLIENT_REALTIME, useValue: { emitClientUpdated: jest.fn(), stream: jest.fn() } },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateClientUsecase);
      await usecase.execute({
        clientId: current.clientId.value,
        telephonesReplace: [{ number: "123" }],
      } as any);
      expect(telRepo.deleteByClientId).toHaveBeenCalled();
      expect(telRepo.create).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("allows docType=NONE when reference is empty", async () => {
    const current = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });

    const clientRepo = {
      findById: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue({}),
    };
    const ubigeoRepo = { findByDistrictCode: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: {} },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REALTIME, useValue: { emitClientUpdated: jest.fn(), stream: jest.fn() } },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateClientUsecase);
      await expect(
        usecase.execute({
          clientId: current.clientId.value,
          docType: ClientDocType.NONE,
          docNumber: "",
          reference: "",
        } as any),
      ).resolves.toBeDefined();
      expect(clientRepo.update).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("emits client.updated after changing a workflow-relevant client field", async () => {
    const now = new Date("2026-06-25T10:00:00.000Z");
    const current = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });
    const clientRepo = {
      findById: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue({}),
    };
    const clientRealtime = {
      emitClientUpdated: jest.fn(),
      stream: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => now } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: { deleteByClientId: jest.fn(), create: jest.fn() } },
        { provide: UBIGEO_REPOSITORY, useValue: { findByDistrictCode: jest.fn() } },
        { provide: CLIENT_REALTIME, useValue: clientRealtime },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateClientUsecase);
      await usecase.execute({
        clientId: current.clientId.value,
        docNumber: "87654321",
      } as any);

      expect(clientRealtime.emitClientUpdated).toHaveBeenCalledWith({
        clientId: current.clientId.value,
        changedFields: ["client.docNumber"],
        occurredAt: now.toISOString(),
      });
    } finally {
      await moduleRef.close();
    }
  });

  it("does not emit client.updated when only non-workflow client fields change", async () => {
    const current = Client.create({
      type: ClientType.NEW,
      fullName: "Juan Perez",
      docType: ClientDocType.DNI,
      docNumber: "12345678",
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      isActive: true,
    });
    const clientRealtime = {
      emitClientUpdated: jest.fn(),
      stream: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date("2026-06-25T10:00:00.000Z") } },
        {
          provide: CLIENT_REPOSITORY,
          useValue: {
            findById: jest.fn().mockResolvedValue(current),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        { provide: TELEPHONE_REPOSITORY, useValue: {} },
        { provide: UBIGEO_REPOSITORY, useValue: { findByDistrictCode: jest.fn() } },
        { provide: CLIENT_REALTIME, useValue: clientRealtime },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateClientUsecase);
      await usecase.execute({
        clientId: current.clientId.value,
        fullName: "Juan Perez Actualizado",
      } as any);

      expect(clientRealtime.emitClientUpdated).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
