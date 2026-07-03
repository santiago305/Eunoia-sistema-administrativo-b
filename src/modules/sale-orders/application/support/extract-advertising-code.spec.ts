import { extractAdvertisingCode } from "./extract-advertising-code";

describe("extractAdvertisingCode", () => {
  it.each([
    ["FB RECOMPRA 120243801710520154", "120243801710520154"],
    ["META ABC1202438017105", "ABC1202438017105"],
    ["REF 1234567890123 ABC120243801710520154", "ABC120243801710520154"],
  ])("extracts the longest valid block from %s", (value, expected) => {
    expect(extractAdvertisingCode(value)).toBe(expected);
  });

  it.each([
    ["FB RECOMPRA 123456789012"],
    ["FB RECOMPRA CODIGOPUBLICITARIO"],
    ["FB RECOMPRA 120243 801710520154"],
    [null],
  ])("returns null when %s has no valid block", (value) => {
    expect(extractAdvertisingCode(value)).toBeNull();
  });

  it("keeps the first candidate when valid blocks have the same length", () => {
    expect(extractAdvertisingCode("ABC1234567890 XYZ1234567890")).toBe("ABC1234567890");
  });
});
