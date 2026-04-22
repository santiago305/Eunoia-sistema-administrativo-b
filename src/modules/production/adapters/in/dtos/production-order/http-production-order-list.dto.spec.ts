import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { HttpListProductionOrdersQueryDto } from "./http-production-order-list.dto";

describe("HttpListProductionOrdersQueryDto", () => {
  it("parses filters from json query string", () => {
    const dto = plainToInstance(HttpListProductionOrdersQueryDto, {
      q: "orden",
      filters: JSON.stringify([
        {
          field: "status",
          operator: "in",
          values: ["DRAFT"],
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.filters).toEqual([
      {
        field: "status",
        operator: "in",
        values: ["DRAFT"],
      },
    ]);
  });

  it("rejects legacy smart-search fields that are no longer part of backend contract", () => {
    const dto = plainToInstance(HttpListProductionOrdersQueryDto, {
      filters: JSON.stringify([
        {
          field: "productId",
          operator: "in",
          values: ["product-1"],
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).not.toHaveLength(0);
  });
});
