import { buildSaleOrderItemDisplayFields } from "./sale-order-item-display-fields";

describe("buildSaleOrderItemDisplayFields", () => {
  it("builds SKUS and detail from ordered components", () => {
    const result = buildSaleOrderItemDisplayFields([
      { customSku: "EVA01863", name: "AMPOLLA", quantity: 1 },
      { customSku: "EVA01893", name: "AZUFRE", quantity: 1 },
      { customSku: "EVA01894", name: "VERDE", quantity: 1 },
    ]);

    expect(result).toEqual({
      SKUS: "EVA01863(1);EVA01893(1);EVA01894(1)",
      detail: "AMPOLLA1AZUFRE1VERDE1",
    });
  });

  it("removes spaces from detail names and trims decimal quantities", () => {
    const result = buildSaleOrderItemDisplayFields([
      { customSku: " EVA001 ", name: "JABON AZUFRE", quantity: 1.5 },
      { customSku: "EVA002", name: "CREMA  VERDE", quantity: 2.25 },
    ]);

    expect(result).toEqual({
      SKUS: "EVA001(1.5);EVA002(2.25)",
      detail: "JABONAZUFRE1.5CREMAVERDE2.25",
    });
  });

  it("skips missing SKU codes or names independently", () => {
    const result = buildSaleOrderItemDisplayFields([
      { customSku: null, name: "AMPOLLA", quantity: 1 },
      { customSku: "   ", name: "   ", quantity: 2 },
      { customSku: "EVA003", name: null, quantity: 3 },
    ]);

    expect(result).toEqual({
      SKUS: "EVA003(3)",
      detail: "AMPOLLA1",
    });
  });
});
