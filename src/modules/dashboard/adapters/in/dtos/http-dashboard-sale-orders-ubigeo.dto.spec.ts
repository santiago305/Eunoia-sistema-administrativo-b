import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { HttpDashboardSaleOrdersUbigeoQueryDto } from "./http-dashboard-sale-orders-ubigeo.dto";

describe("HttpDashboardSaleOrdersUbigeoQueryDto", () => {
  it("parses smart date filters from a JSON query string", () => {
    const dto = plainToInstance(HttpDashboardSaleOrdersUbigeoQueryDto, {
      filters: JSON.stringify([
        { field: "scheduleDate", operator: "inWeek", value: "2026-06-29" },
        { field: "deliveryDate", operator: "inMonth", value: "2026-07" },
      ]),
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.filters).toEqual([
      { field: "scheduleDate", operator: "inWeek", value: "2026-06-29" },
      { field: "deliveryDate", operator: "inMonth", value: "2026-07" },
    ]);
  });
});
