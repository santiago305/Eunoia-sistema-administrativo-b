import {
  divideMoneyByQuantity,
  fromMinorUnits,
  multiplyMoneyByQuantity,
  multiplyQuantities,
  roundMoney,
  toMinorUnits,
} from "./money";

describe("financial money precision", () => {
  it("converts decimal strings to integer cents without binary floating-point drift", () => {
    expect(toMinorUnits("10.10")).toBe(1010);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(fromMinorUnits(1010)).toBe(10.1);
  });

  it("uses ROUND_HALF_UP at two decimal places", () => {
    expect(roundMoney("1.005")).toBe(1.01);
    expect(roundMoney("1.0049")).toBe(1);
    expect(roundMoney("-1.005")).toBe(-1.01);
  });

  it("multiplies and divides amounts by decimal quantities using integer minor units", () => {
    expect(multiplyMoneyByQuantity(0.1, 3)).toBe(0.3);
    expect(multiplyMoneyByQuantity(19.99, 1.25)).toBe(24.99);
    expect(divideMoneyByQuantity(10, 3)).toBe(3.33);
    expect(divideMoneyByQuantity(1, 0.04)).toBe(25);
    expect(divideMoneyByQuantity(10, 0)).toBe(0);
  });

  it("multiplies fractional pack quantities in hundredths with half-up rounding", () => {
    expect(multiplyQuantities(0.1, 0.15)).toBe(0.02);
    expect(multiplyQuantities("0.30", "0.20")).toBe(0.06);
    expect(multiplyQuantities(1.25, 0.08)).toBe(0.1);
  });

  it("rejects non-numeric values and unsafe amounts", () => {
    expect(() => toMinorUnits("not-money")).toThrow("El importe debe ser numérico");
    expect(() => toMinorUnits("999999999999999999999.99")).toThrow("fuera del rango permitido");
  });
});
