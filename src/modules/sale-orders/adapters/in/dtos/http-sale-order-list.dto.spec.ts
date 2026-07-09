import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { HttpListSaleOrdersQueryDto } from "./http-sale-order-list.dto";

describe("HttpListSaleOrdersQueryDto", () => {
  it("parses smart-search filters from json query string", () => {
    const dto = plainToInstance(HttpListSaleOrdersQueryDto, {
      q: "S01",
      filters: JSON.stringify([
        { field: "paymentStatus", operator: "in", values: ["PAID"] },
        { field: "workflowId", operator: "in", values: ["workflow-1"] },
        { field: "scheduleDate", operator: "between", range: { start: "2026-05-01", end: "2026-05-31" } },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.filters).toEqual([
      { field: "paymentStatus", operator: "in", values: ["PAID"] },
      { field: "workflowId", operator: "in", values: ["workflow-1"] },
      { field: "scheduleDate", operator: "between", range: { start: "2026-05-01", end: "2026-05-31" } },
    ]);
  });

  it("rejects unknown smart-search fields", () => {
    const dto = plainToInstance(HttpListSaleOrdersQueryDto, {
      filters: JSON.stringify([{ field: "unknown", operator: "in", values: ["x"] }]),
    });

    const errors = validateSync(dto);
    expect(errors).not.toHaveLength(0);
  });

  it("accepts semantic month and week operators", () => {
    const dto = plainToInstance(HttpListSaleOrdersQueryDto, {
      filters: JSON.stringify([
        { field: "scheduleDate", operator: "inMonth", value: "2028-02" },
        { field: "deliveryDate", operator: "inWeek", value: "2026-12-28" },
      ]),
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it("accepts creator and assigned user catalog filters", () => {
    const dto = plainToInstance(HttpListSaleOrdersQueryDto, {
      filters: JSON.stringify([
        { field: "createdBy", operator: "in", values: ["user-1", "user-2"] },
        { field: "assignedBy", operator: "in", values: ["user-3"] },
      ]),
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.filters).toEqual([
      { field: "createdBy", operator: "in", values: ["user-1", "user-2"] },
      { field: "assignedBy", operator: "in", values: ["user-3"] },
    ]);
  });
});

