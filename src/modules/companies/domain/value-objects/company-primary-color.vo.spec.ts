import {
  CompanyPrimaryColor,
  DEFAULT_COMPANY_PRIMARY_COLOR,
} from "./company-primary-color.vo";

describe("CompanyPrimaryColor", () => {
  it("normalizes a valid hexadecimal color", () => {
    expect(new CompanyPrimaryColor(" #ff8800 ").value).toBe("#FF8800");
  });

  it("uses the system color by default", () => {
    expect(new CompanyPrimaryColor().value).toBe(DEFAULT_COMPANY_PRIMARY_COLOR);
  });

  it("rejects invalid colors", () => {
    expect(() => new CompanyPrimaryColor("red")).toThrow(
      "El color principal de la empresa es invÃ¡lido",
    );
  });
});
