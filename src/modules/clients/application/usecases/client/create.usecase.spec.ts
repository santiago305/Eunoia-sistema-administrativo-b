import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UBIGEO_REPOSITORY } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { CreateClientUsecase } from "./create.usecase";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ConflictException, BadRequestException } from "@nestjs/common";

describe("CreateClientUsecase", () => {
  it("rejects ubigeo mismatch", async () => {
    const clientRepo = {
      findByDocument: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    const ubigeoRepo = {
      findByDistrictCode: jest.fn().mockResolvedValue({
        department: { id: "15", name: "LIMA" },
        province: { id: "1501", name: "LIMA" },
        district: { id: "150101", name: "LIMA" },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date("2026-05-19T00:00:00.000Z") } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: {} },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateClientUsecase);

      await expect(
        usecase.execute({
          type: ClientType.NEW,
          fullName: "Juan Perez",
          docType: ClientDocType.DNI,
          docNumber: "12345678",
          departmentId: "14",
          provinceId: "1401",
          districtId: "150101",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(clientRepo.create).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("rejects duplicate document", async () => {
    const clientRepo = {
      findByDocument: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
    };
    const ubigeoRepo = { findByDistrictCode: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: {} },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateClientUsecase);

      await expect(
        usecase.execute({
          type: ClientType.NEW,
          fullName: "Juan Perez",
          docType: ClientDocType.DNI,
          docNumber: "12345678",
          departmentId: "15",
          provinceId: "1501",
          districtId: "150101",
        }),
      ).rejects.toThrow(ConflictException);
      expect(clientRepo.create).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("creates telephones atomically with client", async () => {
    const clientRepo = {
      findByDocument: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    const ubigeoRepo = {
      findByDistrictCode: jest.fn().mockResolvedValue({
        department: { id: "15", name: "LIMA" },
        province: { id: "1501", name: "LIMA" },
        district: { id: "150101", name: "LIMA" },
      }),
    };
    const telRepo = {
      create: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({ tx: true }) } },
        { provide: CLOCK, useValue: { now: () => new Date("2026-05-19T00:00:00.000Z") } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateClientUsecase);
      await usecase.execute({
        type: ClientType.NEW,
        fullName: "Juan Perez",
        docType: ClientDocType.DNI,
        docNumber: "12345678",
        departmentId: "15",
        provinceId: "1501",
        districtId: "150101",
        telephonesReplace: [
          { number: "999999999", isMain: true },
          { number: "988888888" },
        ],
      });

      expect(clientRepo.create).toHaveBeenCalled();
      expect(telRepo.create).toHaveBeenCalledTimes(2);
    } finally {
      await moduleRef.close();
    }
  });

  it("allows docType=NONE with empty docNumber and non-empty reference", async () => {
    const clientRepo = {
      findByDocument: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    const ubigeoRepo = {
      findByDistrictCode: jest.fn().mockResolvedValue({
        department: { id: "15", name: "LIMA" },
        province: { id: "1501", name: "LIMA" },
        district: { id: "150101", name: "LIMA" },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateClientUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: CLOCK, useValue: { now: () => new Date("2026-05-19T00:00:00.000Z") } },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: {} },
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateClientUsecase);
      await usecase.execute({
        type: ClientType.UNDEFINED,
        fullName: "Juan Perez",
        docType: ClientDocType.NONE,
        docNumber: "",
        reference: "Cliente sin documento - feria",
        departmentId: "15",
        provinceId: "1501",
        districtId: "150101",
      });

      expect(clientRepo.findByDocument).not.toHaveBeenCalled();
      expect(clientRepo.create).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
