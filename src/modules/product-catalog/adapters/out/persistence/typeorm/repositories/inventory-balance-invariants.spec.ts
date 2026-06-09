import { validateInventoryBalance } from "./inventory.typeorm.repo";

describe("validateInventoryBalance", () => {
  it.each([
    { onHand: 10, reserved: -1 },
    { onHand: -1, reserved: 0 },
    { onHand: 2, reserved: 3 },
  ])("rejects invalid balance %p", (balance) => {
    expect(() => validateInventoryBalance(balance)).toThrow("Balance de inventario invalido");
  });

  it("accepts a valid balance", () => {
    expect(() => validateInventoryBalance({ onHand: 10, reserved: 4 })).not.toThrow();
  });
});
