import {
  buildSaleOrderSearchLabel,
  sanitizeSaleOrderSearchFilters,
} from "./sale-order-search.utils";

describe("sale order search utils", () => {
  it("keeps bank account and client type catalog filters", () => {
    expect(
      sanitizeSaleOrderSearchFilters([
        { field: "bankAccountId", operator: "in", values: ["bank-1"] },
        { field: "clientType", operator: "in", values: ["NEW", "REPURCHASE", "INVALID"] },
      ] as any),
    ).toEqual([
      { field: "bankAccountId", operator: "in", mode: "include", values: ["bank-1"] },
      { field: "clientType", operator: "in", mode: "include", values: ["NEW", "REPURCHASE"] },
    ]);
  });

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

  it("uses bank account and client type labels in saved searches", () => {
    const label = buildSaleOrderSearchLabel(
      {
        filters: [
          { field: "bankAccountId", operator: "in", values: ["bank-1"] },
          { field: "clientType", operator: "in", values: ["NEW", "LAGGING"] },
        ],
      } as any,
      {
        bankAccounts: new Map([["bank-1", "BCP Soles"]]),
        clientTypes: new Map([
          ["NEW", "Nuevo"],
          ["LAGGING", "Rezagado"],
        ]),
      } as any,
    );

    expect(label).toBe("Cuenta: BCP Soles | Tipo cliente: Nuevo - Rezagado");
  });
});
