import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ListSupplierQueryDto } from "./http-supplier-list.dto";

describe("ListSupplierQueryDto", () => {
  it("parses smart-search filters from json query string", () => {
    const dto = plainToInstance(ListSupplierQueryDto, {
      q: "ana",
      filters: JSON.stringify([
        {
          field: "isActive",
          operator: "in",
          values: ["false"],
        },
        {
          field: "documentNumber",
          operator: "contains",
          value: "20123",
        },
      ]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.filters).toEqual([
      { field: "isActive", operator: "in", values: ["false"] },
      { field: "documentNumber", operator: "contains", value: "20123" },
    ]);
  });

  it("rejects legacy smart-search fields that are no longer part of backend contract", () => {
    const dto = plainToInstance(ListSupplierQueryDto, {
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
