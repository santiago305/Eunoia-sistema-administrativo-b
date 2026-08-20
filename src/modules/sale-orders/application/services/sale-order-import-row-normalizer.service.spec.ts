import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UBIGEO_REPOSITORY } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { SaleOrderImportRowNormalizerService } from "./sale-order-import-row-normalizer.service";
import { SaleOrderSkuRecognitionCodeService } from "./sale-order-sku-recognition-code.service";

describe("SaleOrderImportRowNormalizerService", () => {
  const skuRecognitionCodes = {
    listActiveCodes: jest.fn().mockResolvedValue(["EVA"]),
  };
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
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
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
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
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
          internalNote: "FB RECOMPRA 120243801710520154",
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.row.ubigeo?.districtId).toBe("dist-1");
        expect(result.row.clientResolution.clientId).toBe("client-1");
        expect(result.row.parsedSkus.length).toBeGreaterThan(0);
        expect(result.row.advertisingCode).toBe("120243801710520154");
      }
    } finally {
      await moduleRef.close();
    }
  });

  it.each([
    "Prov. Const. del Callao",
    "Prov Const del Callao",
    "Prov. Constitucional del Callao",
    "Provincia Constitucional del Callao",
  ])("resolves the Callao province alias %s", async (provinceName) => {
    const ubigeoRepo = {
      listDepartments: jest.fn().mockResolvedValue([{ id: "07", name: "Callao" }]),
      listProvincesByDepartmentIds: jest.fn().mockResolvedValue([
        { id: "0701", name: "Callao", departmentId: "07" },
      ]),
      listDistrictsByProvinceIds: jest.fn().mockResolvedValue([
        { id: "070106", name: "Ventanilla", provinceId: "0701" },
      ]),
    };
    const clientRepo = {
      findByDocument: jest.fn(),
      findByReference: jest.fn(),
    };
    const telephoneRepo = { findByNumber: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
      ],
    }).compile();

    try {
      const svc = moduleRef.get(SaleOrderImportRowNormalizerService);
      const result = await svc.normalize(
        {
          recipientName: "Cliente Callao",
          phone: "+51918536756",
          departmentName: "Callao",
          provinceName,
          districtName: "Ventanilla",
          productCodes: "JABON-AZUFRE-EVA01893 x 1",
          total: 149.9,
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.row.ubigeo).toEqual({
          departmentId: "07",
          provinceId: "0701",
          districtId: "070106",
        });
      }
    } finally {
      await moduleRef.close();
    }
  });

  it("returns the Excel row and original product text when no configured code matches", async () => {
    const ubigeoRepo = {
      listDepartments: jest.fn().mockResolvedValue([]),
      listProvincesByDepartmentIds: jest.fn(),
      listDistrictsByProvinceIds: jest.fn(),
    };
    const clientRepo = { findByDocument: jest.fn(), findByReference: jest.fn() };
    const telephoneRepo = { findByNumber: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
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
          productCodes: "AMPOLLA ANTI MANCHAS-EUN001",
          total: 120,
        } as any,
        8,
      );

      expect(result).toEqual({
        ok: false,
        rowNumber: 8,
        errors: [
          "Código de reconocimiento no encontrado en fila 8: AMPOLLA ANTI MANCHAS-EUN001",
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });

  it("recognizes a newly configured prefix without changing the parser", async () => {
    const ubigeoRepo = {
      listDepartments: jest.fn().mockResolvedValue([]),
      listProvincesByDepartmentIds: jest.fn(),
      listDistrictsByProvinceIds: jest.fn(),
    };
    const clientRepo = { findByDocument: jest.fn(), findByReference: jest.fn() };
    const telephoneRepo = { findByNumber: jest.fn().mockResolvedValue(null) };
    skuRecognitionCodes.listActiveCodes.mockResolvedValueOnce(["EVA", "EUN"]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
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
          productCodes: "AMPOLLA ANTI MANCHAS-EUN001",
          total: 120,
        } as any,
        8,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.row.parsedSkus[0]?.customSku).toBe("EUN001");
      }
    } finally {
      await moduleRef.close();
    }
  });

  it("resolves by delivery note reference before falling back to phone", async () => {
    const ubigeoRepo = {
      listDepartments: jest.fn(),
      listProvincesByDepartmentIds: jest.fn(),
      listDistrictsByProvinceIds: jest.fn(),
    };
    const clientRepo = { findByDocument: jest.fn(), findByReference: jest.fn() };
    const telephoneRepo = { findByNumber: jest.fn() };

    ubigeoRepo.listDepartments.mockResolvedValue([{ id: "15", name: "LIMA" }]);
    ubigeoRepo.listProvincesByDepartmentIds.mockResolvedValue([{ id: "1501", name: "LIMA" }]);
    ubigeoRepo.listDistrictsByProvinceIds.mockResolvedValue([{ id: "150114", name: "LA MOLINA" }]);

    clientRepo.findByReference.mockResolvedValue(null);
    telephoneRepo.findByNumber.mockResolvedValue({ clientId: "old-client-with-empty-reference" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
      ],
    }).compile();

    try {
      const svc = moduleRef.get(SaleOrderImportRowNormalizerService);
      const result = await svc.normalize(
        {
          recipientName: "Carla Gonzalez Caceres",
          phone: "+51995622971",
          departmentName: "Lima",
          provinceName: "Lima",
          districtName: "La Molina",
          deliveryNote: "-12.067073487054728, -76.95337387116433",
          productCodes: "AMPOLLA-EVA01863 x 1",
          total: 299.8,
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(clientRepo.findByReference).toHaveBeenCalledWith(
          "-12.067073487054728 -76.95337387116433",
        );
        expect(telephoneRepo.findByNumber).toHaveBeenCalledWith("51995622971");
        expect(result.row.clientResolution.clientId).toBe("old-client-with-empty-reference");
        expect(result.row.clientResolution.matchedBy).toBe("PHONE");
      }
    } finally {
      await moduleRef.close();
    }
  });

  it("keeps delivery note reference available for client creation when no client matches", async () => {
    const ubigeoRepo = {
      listDepartments: jest.fn(),
      listProvincesByDepartmentIds: jest.fn(),
      listDistrictsByProvinceIds: jest.fn(),
    };
    const clientRepo = { findByDocument: jest.fn(), findByReference: jest.fn() };
    const telephoneRepo = { findByNumber: jest.fn() };

    ubigeoRepo.listDepartments.mockResolvedValue([{ id: "15", name: "LIMA" }]);
    ubigeoRepo.listProvincesByDepartmentIds.mockResolvedValue([{ id: "1501", name: "LIMA" }]);
    ubigeoRepo.listDistrictsByProvinceIds.mockResolvedValue([{ id: "150114", name: "LA MOLINA" }]);

    clientRepo.findByReference.mockResolvedValue(null);
    telephoneRepo.findByNumber.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
      ],
    }).compile();

    try {
      const svc = moduleRef.get(SaleOrderImportRowNormalizerService);
      const result = await svc.normalize(
        {
          recipientName: "Carla Gonzalez Caceres",
          phone: "+51995622971",
          departmentName: "Lima",
          provinceName: "Lima",
          districtName: "La Molina",
          deliveryNote: "-12.067073487054728, -76.95337387116433",
          productCodes: "AMPOLLA-EVA01863 x 1",
          total: 299.8,
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(clientRepo.findByReference).toHaveBeenCalledWith(
          "-12.067073487054728 -76.95337387116433",
        );
        expect(telephoneRepo.findByNumber).toHaveBeenCalledWith("51995622971");
        expect(result.row.parsedDocument.docType).toBe("NONE");
        expect(result.row.parsedDocument.reference).toBe(
          "-12.067073487054728, -76.95337387116433",
        );
        expect(result.row.clientResolution.clientId).toBeNull();
      }
    } finally {
      await moduleRef.close();
    }
  });
});
