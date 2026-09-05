import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UBIGEO_REPOSITORY } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { CLIENT_REPOSITORY } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { SaleOrderImportRowNormalizerService } from "./sale-order-import-row-normalizer.service";
import { SaleOrderSkuRecognitionCodeService } from "./sale-order-sku-recognition-code.service";
import { SourceRecognitionCodeService } from "src/modules/sources/application/services/source-recognition-code.service";

describe("SaleOrderImportRowNormalizerService", () => {
  const skuRecognitionCodes = {
    listActiveCodes: jest.fn().mockResolvedValue(["EVA"]),
  };
  const sourceRecognitionCodes = {
    recognize: jest.fn().mockResolvedValue(null),
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
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
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
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
      ],
    }).compile();

    sourceRecognitionCodes.recognize.mockResolvedValueOnce({
      sourceId: "source-facebook",
      sourceName: "FACEBOOK",
      code: "FB",
      advertisingCode: "RECOMPRA 120243801710520154",
    });

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
          orderDate: "18/08/2026 10:15",
          deliveryDate: "8/20/26 14:30",
          internalNote: "FB RECOMPRA 120243801710520154",
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.row.ubigeo?.districtId).toBe("dist-1");
        expect(result.row.clientResolution.clientId).toBe("client-1");
        expect(result.row.parsedSkus.length).toBeGreaterThan(0);
        expect(result.row.orderDate).toBe("2026-08-18");
        expect(result.row.deliveryDate).toBe("2026-08-20");
        expect(result.row.advertisingCode).toBe("RECOMPRA 120243801710520154");
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
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
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

  it.each([
    ["Carmen de la Legua Reynoso", "Carmen de La Legua"],
    ["Carmen de la Legua", "Carmen de la Legua Reynoso"],
    ["Carmen de la Legua-Reynoso", "Carmen de La Legua"],
  ])(
    "resolves the district alias %s against catalog name %s",
    async (districtName, catalogDistrictName) => {
      const ubigeoRepo = {
        listDepartments: jest.fn().mockResolvedValue([{ id: "07", name: "Callao" }]),
        listProvincesByDepartmentIds: jest.fn().mockResolvedValue([
          { id: "0701", name: "Callao", departmentId: "07" },
        ]),
        listDistrictsByProvinceIds: jest.fn().mockResolvedValue([
          { id: "070103", name: catalogDistrictName, provinceId: "0701" },
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
          { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
        ],
      }).compile();

      try {
        const svc = moduleRef.get(SaleOrderImportRowNormalizerService);
        const result = await svc.normalize(
          {
            recipientName: "Cliente Carmen de la Legua",
            phone: "+51981046002",
            departmentName: "Callao",
            provinceName: "Prov. Const. del Callao",
            districtName,
            productCodes: "JABON DE CURCUMA-EVA02032 x 2",
            total: 60,
          } as any,
          34,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.row.ubigeo).toEqual({
            departmentId: "07",
            provinceId: "0701",
            districtId: "070103",
          });
        }
      } finally {
        await moduleRef.close();
      }
    },
  );

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
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
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
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
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

  it("resolves by phone without trusting a delivery note reference", async () => {
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

    clientRepo.findByReference.mockResolvedValue({ clientId: { value: "wrong-client-from-reference" } });
    telephoneRepo.findByNumber.mockResolvedValue({ clientId: "old-client-with-empty-reference" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
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
        expect(clientRepo.findByReference).not.toHaveBeenCalled();
        expect(telephoneRepo.findByNumber).toHaveBeenCalledWith("995622971");
        expect(result.row.clientResolution.clientId).toBe("old-client-with-empty-reference");
        expect(result.row.clientResolution.matchedBy).toBe("PHONE");
      }
    } finally {
      await moduleRef.close();
    }
  });

  it("does not resolve a new client by a generic delivery note reference", async () => {
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

    clientRepo.findByReference.mockResolvedValue({ clientId: { value: "wrong-client-from-reference" } });
    telephoneRepo.findByNumber.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportRowNormalizerService,
        { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
        { provide: CLIENT_REPOSITORY, useValue: clientRepo },
        { provide: TELEPHONE_REPOSITORY, useValue: telephoneRepo },
        { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
        { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
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
          deliveryNote: "PIURA",
          productCodes: "AMPOLLA-EVA01863 x 1",
          total: 299.8,
        } as any,
        2,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(clientRepo.findByReference).not.toHaveBeenCalled();
        expect(telephoneRepo.findByNumber).toHaveBeenCalledWith("995622971");
        expect(result.row.parsedDocument.docType).toBe("NONE");
        expect(result.row.parsedDocument.reference).toBe(
          "PIURA",
        );
        expect(result.row.clientResolution.clientId).toBeNull();
      }
    } finally {
      await moduleRef.close();
    }
  });

  it.each([
    ["Ica", "Nazca", "Nasca", "11", "1103", "110301"],
    ["Ica", "Nasca", "Nazca", "11", "1103", "110301"],
    ["Cuzco", "Cuzco", "Cuzco", "08", "0801", "080101"],
    ["Cusco", "Cuzco", "Cusco", "08", "0801", "080101"],
  ])(
    "resolves ubigeo spelling aliases: %s / %s / %s",
    async (departmentName, provinceName, districtName, departmentId, provinceId, districtId) => {
      const ubigeoRepo = {
        listDepartments: jest.fn().mockResolvedValue([
          { id: "11", name: "Ica" },
          { id: "08", name: "Cusco" },
        ]),
        listProvincesByDepartmentIds: jest.fn().mockResolvedValue([
          { id: "1103", name: "Nazca", departmentId: "11" },
          { id: "0801", name: "Cusco", departmentId: "08" },
        ]),
        listDistrictsByProvinceIds: jest.fn().mockResolvedValue([
          { id: "110301", name: "Nazca", provinceId: "1103" },
          { id: "080101", name: "Cusco", provinceId: "0801" },
        ]),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          SaleOrderImportRowNormalizerService,
          { provide: UBIGEO_REPOSITORY, useValue: ubigeoRepo },
          { provide: CLIENT_REPOSITORY, useValue: { findByDocument: jest.fn(), findByReference: jest.fn() } },
          { provide: TELEPHONE_REPOSITORY, useValue: { findByNumber: jest.fn() } },
          { provide: SaleOrderSkuRecognitionCodeService, useValue: skuRecognitionCodes },
          { provide: SourceRecognitionCodeService, useValue: sourceRecognitionCodes },
        ],
      }).compile();

      try {
        const service = moduleRef.get(SaleOrderImportRowNormalizerService) as any;
        const result = await service.resolveUbigeo(departmentName, provinceName, districtName);
        expect(result).toMatchObject({
          department: { id: departmentId },
          province: { id: provinceId },
          district: { id: districtId },
        });
      } finally {
        await moduleRef.close();
      }
    },
  );
});
