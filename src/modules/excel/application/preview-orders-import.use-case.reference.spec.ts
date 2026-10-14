import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import {
  calculateImportedComponentPrices,
  PreviewOrdersImportUseCase,
} from "./preview-orders-import.use-case";

describe("PreviewOrdersImportUseCase client resolution", () => {
  const resolveClient = (PreviewOrdersImportUseCase.prototype as any)
    .resolveClient as (input: any) => Promise<any>;

  it("does not resolve by arbitrary delivery note reference", async () => {
    const findByReference = jest.fn().mockResolvedValue({
      clientId: { value: "wrong-client-from-reference" },
    });
    const ctx: any = {
      debug: jest.fn(),
      telephoneRepo: { findByNumber: jest.fn().mockResolvedValue(null) },
      clientRepo: {
        findByDocument: jest.fn().mockResolvedValue(null),
        findByReference,
      },
    };

    const result = await resolveClient.call(ctx, {
      phone: "958293306",
      parsedDocument: {
        docType: ClientDocType.NONE,
        docNumber: "",
        reference: "PIURA",
      },
    });

    expect(result).toEqual({
      status: "WOULD_CREATE",
      clientId: null,
      matchedBy: null,
    });
    expect(findByReference).not.toHaveBeenCalled();
  });
});

describe("calculateImportedComponentPrices", () => {
  it("allocates rounded component totals in cents without losing the imported subtotal", () => {
    const result = calculateImportedComponentPrices(100.3, [1, 2]);

    expect(result).toEqual([
      { unitPrice: 33.43, total: 33.43 },
      { unitPrice: 33.43, total: 66.87 },
    ]);
    expect(result.reduce((sum, component) => sum + Math.round(component.total * 100), 0)).toBe(10030);
  });

  it("distributes an indivisible cent deterministically and rounds the subtotal to two decimals", () => {
    const result = calculateImportedComponentPrices(100.005, [1, 1]);

    expect(result).toEqual([
      { unitPrice: 50.01, total: 50.01 },
      { unitPrice: 50.01, total: 50 },
    ]);
    expect(result.reduce((sum, component) => sum + Math.round(component.total * 100), 0)).toBe(10001);
  });

  it("returns zero prices for an empty subtotal, rejects priced orders without units, and rejects negative inputs", () => {
    expect(calculateImportedComponentPrices(0, [0, 0])).toEqual([
      { unitPrice: 0, total: 0 },
      { unitPrice: 0, total: 0 },
    ]);
    expect(() => calculateImportedComponentPrices(12.34, [0, 0])).toThrow("subtotal sin cantidades de componentes");
    expect(() => calculateImportedComponentPrices(-1, [1])).toThrow("subtotal de importación no puede ser negativo");
    expect(() => calculateImportedComponentPrices(1, [-1])).toThrow("cantidad de un componente no puede ser negativa");
  });
});
