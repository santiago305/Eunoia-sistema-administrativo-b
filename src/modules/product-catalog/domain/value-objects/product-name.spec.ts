import { normalizeProductName } from "./product-name";

describe("normalizeProductName", () => {
  it.each(["Jabon", "jabon", "JABON"])("normalizes %s consistently", (name) => {
    expect(normalizeProductName(name)).toEqual({
      normalizedName: "jabon",
      displayName: "Jabon",
    });
  });

  it("preserves accents in the visible name while ignoring them for comparisons", () => {
    expect(normalizeProductName("  JABÓN  ")).toEqual({
      normalizedName: "jabon",
      displayName: "Jabón",
    });
  });

  it("collapses internal spaces and preserves enye", () => {
    expect(normalizeProductName("  CAÑA   DULCE ")).toEqual({
      normalizedName: "caña dulce",
      displayName: "Caña dulce",
    });
  });
});
