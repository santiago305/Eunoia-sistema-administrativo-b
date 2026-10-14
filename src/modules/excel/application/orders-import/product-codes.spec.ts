import { parseProductCodes } from "./product-codes";

const resolve = (code: string) => ({
  productName: code,
  variantName: null,
  skuName: code,
  customSku: code,
});

describe("parseProductCodes quantity normalization", () => {
  it("aggregates repeated SKUs in exact hundredths without floating-point drift", () => {
    expect(parseProductCodes("SKU-A x 0.10, SKU-A x 0.20", resolve)).toEqual([
      expect.objectContaining({ customSku: "SKU-A", quantity: 0.3 }),
    ]);
  });

  it("rejects zero quantities instead of silently dropping the imported SKU", () => {
    expect(() => parseProductCodes("SKU-A x 0", resolve)).toThrow("La cantidad debe ser mayor que cero.");
  });

  it("allows excess trailing zeroes but rejects precision that the database would round", () => {
    expect(parseProductCodes("SKU-A x 1.2300", resolve)[0].quantity).toBe(1.23);
    expect(() => parseProductCodes("SKU-A x 1.234", resolve)).toThrow("La cantidad admite como máximo dos decimales.");
  });

  it("enforces the numeric(12,2) bound for an individual and aggregated SKU", () => {
    expect(parseProductCodes("SKU-A x 9999999999.99", resolve)[0].quantity).toBe(9_999_999_999.99);
    expect(() => parseProductCodes("SKU-A x 10000000000", resolve)).toThrow("La cantidad supera el máximo permitido");
    expect(() => parseProductCodes("SKU-A x 6000000000, SKU-A x 4000000000", resolve)).toThrow("La cantidad acumulada de un producto supera el máximo permitido");
  });
});
