import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { HttpListPurchaseOrdersQueryDto } from "./http-purchase-order-list.dto";

describe("HttpListPurchaseOrdersQueryDto", () => {
  it("parses smart-search filters from json query string", () => {
    const dto = plainToInstance(HttpListPurchaseOrdersQueryDto, {
      q: "orden",
      filters: JSON.stringify([
        {
          field: "waitTime",
          operator: "in",
          values: ["IN_PROGRESS"],
        },
        {
          field: "dateIssue",
          operator: "between",
          range: {
            start: "2026-04-01",
            end: "2026-04-10",
          },
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.filters).toEqual([
      {
        field: "waitTime",
        operator: "in",
        values: ["IN_PROGRESS"],
      },
      {
        field: "dateIssue",
        operator: "between",
        range: {
          start: "2026-04-01",
          end: "2026-04-10",
        },
      },
    ]);
  });

  it("rejects unknown smart-search fields", () => {
    const dto = plainToInstance(HttpListPurchaseOrdersQueryDto, {
      filters: JSON.stringify([
        {
          field: "unknownField",
          operator: "in",
          values: ["x"],
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).not.toHaveLength(0);
  });
});
