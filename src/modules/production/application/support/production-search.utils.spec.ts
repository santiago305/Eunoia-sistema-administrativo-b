import {
  legacyProductionFiltersToRules,
  sanitizeProductionSearchSnapshot,
} from "./production-search.utils";

describe("production-search.utils", () => {
  it("normalizes q and merges repeated catalog filters", () => {
    const snapshot = sanitizeProductionSearchSnapshot({
      q: "  orden  ",
      filters: [
        { field: "status", operator: "in", values: ["DRAFT"] },
        { field: "status", operator: "in", mode: "exclude", values: ["COMPLETED"] },
        { field: "number", operator: "contains", value: " OP-01 " },
      ],
    });

    expect(snapshot).toEqual({
      q: "orden",
      filters: [
        {
          field: "status",
          operator: "in",
          mode: "exclude",
          values: ["DRAFT", "COMPLETED"],
        },
        {
          field: "number",
          operator: "contains",
          value: "OP-01",
        },
      ],
    });
  });

  it("translates legacy params to search rules", () => {
    expect(
      legacyProductionFiltersToRules({
        status: "DRAFT" as any,
        warehouseId: "warehouse-1",
        skuId: "sku-1",
        from: "2026-04-01",
        to: "2026-04-10",
      }),
    ).toEqual([
      {
        field: "status",
        operator: "in",
        values: ["DRAFT"],
      },
      {
        field: "warehouseId",
        operator: "in",
        values: ["warehouse-1"],
      },
      {
        field: "skuId",
        operator: "in",
        values: ["sku-1"],
      },
      {
        field: "createdAt",
        operator: "between",
        range: {
          start: "2026-04-01",
          end: "2026-04-10",
        },
      },
    ]);
  });
});
