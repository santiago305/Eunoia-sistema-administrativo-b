import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UBIGEO_REPOSITORY } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { SaleOrderImportRowNormalizerService } from "./sale-order-import-row-normalizer.service";

describe("SaleOrderImportRowNormalizerService", () => {
  it("returns validation errors for missing required fields", async () => {
    const ubigeoRepo = { listDepartments: jest.fn(), listProvincesByDepartmentIds: jest.fn(), listDistrictsByProvinceIds: jest.fn() };
    const clientRepo = { findByDocument: jest.fn(), findByReference: jest.fn() };
    const telephoneRepo = { findByNumber: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
      ],
    }).compile();

    try {
      const svc = moduleRef.get(SaleOrderImportRowNormalizerService);
      const result = await svc.normalize({} as any, 2);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as Extract<typeof result, { ok: false }>;
        expect(failed.rowNumber).toBe(2);
        expect(failed.errors.join(" | ")).toContain("Numero de telefono es obligatorio");
        expect(failed.errors.join(" | ")).toContain("Incluye codigos de producto es obligatorio");
      }
    } finally {
      await moduleRef.close();
    }
  });

  it("normalizes a valid row and resolves ubigeo and client match", async () => {
    const ubigeoRepo = {
      listDepartments: jest.fn(),
      listProvincesByDepartmentIds: jest.fn(),
      listDistrictsByProvinceIds: jest.fn(),
    };
    const clientRepo = { findByDocument: jest.fn(), findByReference: jest.fn() };
    const telephoneRepo = { findByNumber: jest.fn() };

    ubigeoRepo.listDepartments.mockResolvedValue([{ id: "dep-1", name: "LIMA" }]);
    ubigeoRepo.listProvincesByDepartmentIds.mockResolvedValue([{ id: "prov-1", name: "LIMA" }]);
    ubigeoRepo.listDistrictsByProvinceIds.mockResolvedValue([{ id: "dist-1", name: "MIRAFLORES" }]);

    telephoneRepo.findByNumber.mockResolvedValue({ clientId: "client-1" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
      ],
    }).compile();

    try {
      const svc = moduleRef.get(SaleOrderImportRowNormalizerService);
      const result = await svc.normalize(
        {
          recipientName: "Juan Perez",
          phone: "999999999",
          departmentName: "LIMA",
          provinceName: "LIMA",
          districtName: "MIRAFLORES",
          productCodes: "AMPOLLA - ROJO - EVA001",
          total: 120,
          quantity: 2,
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.row.ubigeo?.districtId).toBe("dist-1");
        expect(result.row.clientResolution.clientId).toBe("client-1");
        expect(result.row.parsedSkus.length).toBeGreaterThan(0);
      }
    } finally {
      await moduleRef.close();
    }
  });
});
