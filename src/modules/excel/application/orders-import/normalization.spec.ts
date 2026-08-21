import { fixMojibake, normalizePhone, normalizeTextForMatch, parseDateOnly, parseNumber } from "./normalization";

describe("orders-import normalization", () => {
  test("fixMojibake reverses common UTF8/latin1 mojibake", () => {
    expect(fixMojibake("NÃºmero de telÃ©fono")).toBe("Número de teléfono");
  });

  test("normalizeTextForMatch removes accents and normalizes whitespace", () => {
    expect(normalizeTextForMatch("  Dirección   detallada ")).toBe("direccion detallada");
  });

  test("normalizePhone returns a canonical 9-digit Peruvian mobile", () => {
    expect(normalizePhone("+51 999-888-777")).toBe("999888777");
    expect(normalizePhone("51 999-888-777")).toBe("999888777");
    expect(normalizePhone("0051 999-888-777")).toBe("999888777");
    expect(normalizePhone("999-888-777")).toBe("999888777");
  });

  test("normalizePhone rejects non-mobile or malformed numbers", () => {
    expect(normalizePhone("899888777")).toBe("");
    expect(normalizePhone("99988877")).toBe("");
    expect(normalizePhone("519998887770")).toBe("");
  });

  test("parseNumber supports currency and comma/point formats", () => {
    expect(parseNumber("S/ 1,234.50")).toBe(1234.5);
    expect(parseNumber("1.234,50")).toBe(1234.5);
    expect(parseNumber("  99 ")).toBe(99);
  });

  test.each([
    ["00:00 20/07/2026", "2026-07-20"],
    ["00:00 3/08/26", "2026-08-03"],
    ["00:00 3/06/26", "2026-06-03"],
    ["20/08/2026", "2026-08-20"],
    ["20/08/2026 14:30", "2026-08-20"],
    ["20/08/26", "2026-08-20"],
    ["8/20/26", "2026-08-20"],
    ["2026-08-20T14:30:00-05:00", "2026-08-20"],
    [46254, "2026-08-20"],
  ])("parseDateOnly supports Excel date value %s", (value, expected) => {
    expect(parseDateOnly(value)).toBe(expected);
  });

  test("parseDateOnly rejects impossible or unknown dates", () => {
    expect(parseDateOnly("31/02/2026")).toBeNull();
    expect(parseDateOnly("fecha pendiente")).toBeNull();
  });
});

