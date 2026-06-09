import {
  buildSaleOrderSearchLabel,
  sanitizeSaleOrderSearchFilters,
} from "./sale-order-search.utils";

describe("sale order search utils", () => {
  it("keeps workflow and state catalog filters", () => {
    expect(
      sanitizeSaleOrderSearchFilters([
        { field: "workflowId", operator: "in", values: ["workflow-1"] },
        { field: "saleOrderStateId", operator: "in", mode: "exclude", values: ["state-1"] },
      ] as any),
    ).toEqual([
      { field: "workflowId", operator: "in", mode: "include", values: ["workflow-1"] },
      { field: "saleOrderStateId", operator: "in", mode: "exclude", values: ["state-1"] },
    ]);
  });

  it("uses workflow and state labels in saved searches", () => {
    const label = buildSaleOrderSearchLabel(
      {
        filters: [
          { field: "workflowId", operator: "in", values: ["workflow-1"] },
          { field: "saleOrderStateId", operator: "in", values: ["state-1"] },
        ],
      } as any,
      {
        workflows: new Map([["workflow-1", "Venta"]]),
        states: new Map([["state-1", "Preparando"]]),
      } as any,
    );

    expect(label).toBe("Flujo: Venta | Estado: Preparando");
  });
});
