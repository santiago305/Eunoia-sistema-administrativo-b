import { databaseMigrations } from "../typeorm.config";
import { CreateSaleOrderSkuRecognitionCodes20260819090000 } from "./20260819090000-create-sale-order-sku-recognition-codes";

describe("CreateSaleOrderSkuRecognitionCodes20260819090000", () => {
  it("is registered and creates the table, EVA seed and permissions", async () => {
    expect(databaseMigrations).toContain(
      CreateSaleOrderSkuRecognitionCodes20260819090000,
    );

    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new CreateSaleOrderSkuRecognitionCodes20260819090000();

    await migration.up(queryRunner as never);
    const sql = queries.join("\n");

    expect(sql).toContain("sale_order_sku_recognition_codes");
    expect(sql).toContain("VALUES ('EVA'");
    expect(sql).toContain("sale_orders.sku_recognition_codes.view");
    expect(sql).toContain("sale_orders.sku_recognition_codes.manage");
  });
});
