import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ListWarehouseQueryDto } from "./http-warehouse-list.dto";

describe("ListWarehouseQueryDto", () => {
  it("parses smart-search filters from json query string", () => {
    const dto = plainToInstance(ListWarehouseQueryDto, {
      q: "central",
      filters: JSON.stringify([
        {
          field: "isActive",
          operator: "in",
          values: ["true"],
        },
        {
          field: "name",
          operator: "contains",
          value: "Lima",
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.filters).toEqual([
      { field: "isActive", operator: "in", values: ["true"] },
      { field: "name", operator: "contains", value: "Lima" },
    ]);
  });

  it("rejects legacy smart-search fields that are no longer part of backend contract", () => {
    const dto = plainToInstance(ListWarehouseQueryDto, {
      filters: JSON.stringify([
        {
          field: "status",
          operator: "in",
          values: ["true"],
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).not.toHaveLength(0);
  });
});
