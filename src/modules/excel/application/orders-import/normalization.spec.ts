import { fixMojibake, normalizePhone, normalizeTextForMatch, parseNumber } from "./normalization";

describe("orders-import normalization", () => {
  test("fixMojibake reverses common UTF8/latin1 mojibake", () => {
    expect(fixMojibake("NÃºmero de telÃ©fono")).toBe("Número de teléfono");
  });

  test("normalizeTextForMatch removes accents and normalizes whitespace", () => {
    expect(normalizeTextForMatch("  Dirección   detallada ")).toBe("direccion detallada");
  });

  test("normalizePhone keeps only digits and enforces min length", () => {
    expect(normalizePhone("+51 999-888-777")).toBe("51999888777");
    expect(normalizePhone("12", 7)).toBe("");
  });

  test("parseNumber supports currency and comma/point formats", () => {
    expect(parseNumber("S/ 1,234.50")).toBe(1234.5);
    expect(parseNumber("1.234,50")).toBe(1234.5);
    expect(parseNumber("  99 ")).toBe(99);
  });
});

