import { buildSaleOrderItemDisplayFields } from "./sale-order-item-display-fields";

describe("buildSaleOrderItemDisplayFields", () => {
  it("builds SKUS and detail from ordered components", () => {
    const result = buildSaleOrderItemDisplayFields([
      {
        customSku: "EVA01863",
        name: "AMPOLLA",
        attributes: [{ value: "ANTI ACNE" }],
        quantity: 2,
      },
      {
        customSku: "EVA01893",
        name: "AMPOLLA",
        attributes: [{ value: "ANTI MANCHAS" }],
        quantity: 1,
      },
    ]);

    expect(result).toEqual({
      SKUS: "EVA01863(2);EVA01893(1)",
      detail: "AMPOLLA ANTI ACNE x 2; AMPOLLA ANTI MANCHAS x 1",
    });
  });

  it("normalizes spaces in detail names and trims decimal quantities", () => {
    const result = buildSaleOrderItemDisplayFields([
      { customSku: " EVA001 ", name: "JABON AZUFRE", quantity: 1.5 },
      { customSku: "EVA002", name: "CREMA  VERDE", quantity: 2.25 },
    ]);

    expect(result).toEqual({
      SKUS: "EVA001(1.5);EVA002(2.25)",
      detail: "JABON AZUFRE x 1.5; CREMA VERDE x 2.25",
    });
  });

  it("does not repeat an attribute already included in the SKU name", () => {
    const result = buildSaleOrderItemDisplayFields([
      {
        customSku: "EVA003",
        name: "JABON AZUFRE",
        attributes: [{ value: "Azufre" }],
        quantity: 1,
      },
    ]);

    expect(result.detail).toBe("JABON AZUFRE x 1");
  });

  it("skips missing SKU codes or names independently", () => {
    const result = buildSaleOrderItemDisplayFields([
      { customSku: null, name: "AMPOLLA", quantity: 1 },
      { customSku: "   ", name: "   ", quantity: 2 },
      { customSku: "EVA003", name: null, quantity: 3 },
    ]);

    expect(result).toEqual({
      SKUS: "EVA003(3)",
      detail: "AMPOLLA x 1",
    });
  });

  it("uses backend SKU only when the custom SKU is missing", () => {
    const result = buildSaleOrderItemDisplayFields([
      {
        customSku: "EVA003",
        backendSku: "BACKEND-003",
        name: "AMPOLLA",
        quantity: 1,
      },
      {
        customSku: null,
        backendSku: "BACKEND-004",
        name: "CAJA",
        quantity: 2,
      },
    ]);

    expect(result.SKUS).toBe("EVA003(1);BACKEND-004(2)");
  });
});
