import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { HttpRecurringPurchaseListDto } from "./http-recurring-purchase-list.dto";

describe("HttpRecurringPurchaseListDto", () => {
  it("parses smart-search filters from json query string and defaults to 25 items", () => {
    const dto = plainToInstance(HttpRecurringPurchaseListDto, {
      q: "hosting",
      filters: JSON.stringify([
        {
          field: "nextDueDate",
          operator: "between",
          range: {
            start: "2026-07-01",
            end: "2026-07-31",
          },
        },
        {
          field: "currency",
          operator: "in",
          values: ["PEN"],
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(25);
    expect(dto.filters).toEqual([
      {
        field: "nextDueDate",
        operator: "between",
        range: {
          start: "2026-07-01",
          end: "2026-07-31",
        },
      },
      {
        field: "currency",
        operator: "in",
        values: ["PEN"],
      },
    ]);
  });

  it("rejects unknown smart-search fields", () => {
    const dto = plainToInstance(HttpRecurringPurchaseListDto, {
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
