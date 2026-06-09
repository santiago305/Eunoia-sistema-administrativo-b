import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { HttpSaleOrderStatisticsQueryDto } from "./http-sale-order-statistics.dto";

describe("HttpSaleOrderStatisticsQueryDto", () => {
  it.each([
    ["true", true],
    ["false", false],
  ])("parses includeCancelled=%s", (raw, expected) => {
    const dto = plainToInstance(HttpSaleOrderStatisticsQueryDto, {
      includeCancelled: raw,
      filters: JSON.stringify([{ field: "saleOrderStateId", operator: "in", values: ["state-1"] }]),
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.includeCancelled).toBe(expected);
    expect(dto.filters?.[0].field).toBe("saleOrderStateId");
  });
});
