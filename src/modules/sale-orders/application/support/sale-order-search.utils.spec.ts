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

  it("keeps creator and assigned user catalog filters with multiple values", () => {
    expect(
      sanitizeSaleOrderSearchFilters([
        { field: "createdBy", operator: "in", values: ["user-1", "user-2"] },
        { field: "assignedBy", operator: "in", mode: "exclude", values: ["user-3"] },
      ] as any),
    ).toEqual([
      { field: "createdBy", operator: "in", mode: "include", values: ["user-1", "user-2"] },
      { field: "assignedBy", operator: "in", mode: "exclude", values: ["user-3"] },
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

    expect(label).toBe("Tipo: Venta | Estado: Preparando");
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

  it("uses creator and assigned user labels in saved searches", () => {
    const label = buildSaleOrderSearchLabel(
      {
        filters: [
          { field: "createdBy", operator: "in", values: ["user-1"] },
          { field: "assignedBy", operator: "in", values: ["user-2", "user-3"] },
        ],
      } as any,
      {
        creators: new Map([["user-1", "Santiago"]]),
        assignees: new Map([
          ["user-2", "Ana"],
          ["user-3", "Luis"],
        ]),
      } as any,
    );

    expect(label).toBe("Creado por: Santiago | Asignado a: Ana - Luis");
  });

  it("normalizes calendar periods and preserves semantic labels", () => {
    const filters = sanitizeSaleOrderSearchFilters([
      { field: "scheduleDate", operator: "inMonth", value: "2028-02" },
      { field: "deliveryDate", operator: "inWeek", value: "2027-01-01" },
    ] as any);

    expect(filters).toEqual([
      { field: "scheduleDate", operator: "inMonth", value: "2028-02" },
      { field: "deliveryDate", operator: "inWeek", value: "2026-12-28" },
    ]);
    expect(
      buildSaleOrderSearchLabel({ filters } as any, {}),
    ).toBe(
      "F. Programada en febrero 2028 | F. Entrega en la semana 28 dic 2026 - 3 ene 2027",
    );
  });

  it("discards malformed calendar periods", () => {
    expect(
      sanitizeSaleOrderSearchFilters([
        { field: "scheduleDate", operator: "inMonth", value: "2028-13" },
        { field: "deliveryDate", operator: "inWeek", value: "2026-02-30" },
      ] as any),
    ).toEqual([]);
  });

  it("keeps creation date and sale-order metadata filters", () => {
    expect(
      sanitizeSaleOrderSearchFilters([
        { field: "createdAt", operator: "on", value: "2026-07-01" },
        { field: "advertisingCode", operator: "contains", value: " META " },
        { field: "observation", operator: "eq", value: "Llamar antes" },
      ] as any),
    ).toEqual([
      { field: "createdAt", operator: "on", value: "2026-07-01" },
      { field: "advertisingCode", operator: "contains", value: "META" },
      { field: "observation", operator: "eq", value: "Llamar antes" },
    ]);
  });
});
