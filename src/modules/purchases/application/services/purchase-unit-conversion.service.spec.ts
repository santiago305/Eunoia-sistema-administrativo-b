import { BadRequestException } from "@nestjs/common";
import { PurchaseUnitConversionService } from "./purchase-unit-conversion.service";

describe("PurchaseUnitConversionService", () => {
  const ids = {
    skuId: "11111111-1111-4111-8111-111111111111",
    productId: "22222222-2222-4222-8222-222222222222",
    unitGrmId: "33333333-3333-4333-8333-333333333333",
    unitKgmId: "44444444-4444-4444-8444-444444444444",
  };

  const unitGrm = { id: ids.unitGrmId, code: "GRM", name: "GRAMO" };
  const unitKgm = { id: ids.unitKgmId, code: "KGM", name: "KILOGRAMO" };

  let skuRepo: { findById: jest.Mock };
  let productRepo: { findById: jest.Mock };
  let unitRepo: { findById: jest.Mock; findByCode: jest.Mock; list: jest.Mock };
  let equivalenceRepo: { listByProductId: jest.Mock };
  let service: PurchaseUnitConversionService;

  beforeEach(() => {
    skuRepo = {
      findById: jest.fn().mockResolvedValue({ sku: { productId: ids.productId } }),
    };
    productRepo = {
      findById: jest.fn().mockResolvedValue({ id: ids.productId, baseUnitId: ids.unitGrmId }),
    };
    unitRepo = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === ids.unitGrmId) return unitGrm;
        if (id === ids.unitKgmId) return unitKgm;
        return null;
      }),
      findByCode: jest.fn().mockImplementation(async (code: string) => {
        if (code === "GRM") return unitGrm;
        if (code === "KGM") return unitKgm;
        return null;
      }),
      list: jest.fn().mockResolvedValue([unitGrm, unitKgm]),
    };
    equivalenceRepo = {
      listByProductId: jest.fn().mockResolvedValue([]),
    };

    service = new PurchaseUnitConversionService(
      skuRepo as any,
      productRepo as any,
      unitRepo as any,
      equivalenceRepo as any,
    );
  });

  it("devuelve 1000 cuando se compra KGM y la equivalencia guardada es GRM -> KGM (factor 1000)", async () => {
    equivalenceRepo.listByProductId.mockResolvedValueOnce([
      {
        id: "eq-1",
        productId: ids.productId,
        fromUnitId: ids.unitGrmId,
        toUnitId: ids.unitKgmId,
        factor: 1000,
      },
    ]);

    const result = await service.resolveFactor({
      skuId: ids.skuId,
      unitBase: "KGM",
    });

    expect(result.factor).toBe(1000);
    expect(result.unitBase).toBe("KGM");
    expect(result.equivalence).toBe("KGM->GRM");
  });

  it("devuelve factor 1 cuando la unidad comprada coincide con la unidad base (GRM -> GRM)", async () => {
    const result = await service.resolveFactor({
      skuId: ids.skuId,
      unitBase: "GRM",
      factor: 999,
    });

    expect(result.factor).toBe(1);
    expect(result.unitBase).toBe("GRM");
    expect(result.equivalence).toBe("GRM->GRM");
  });

  it("lanza error claro cuando no existe equivalencia para convertir a unidad base", async () => {
    equivalenceRepo.listByProductId.mockResolvedValueOnce([]);

    await expect(
      service.resolveFactor({
        skuId: ids.skuId,
        unitBase: "KGM",
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.resolveFactor({
        skuId: ids.skuId,
        unitBase: "KGM",
      }),
    ).rejects.toThrow("No existe equivalencia para convertir KGM a GRM en este producto");
  });
});
