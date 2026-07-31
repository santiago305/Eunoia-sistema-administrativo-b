import { databaseMigrations } from "../typeorm.config";
import { HardenSaleOrderTrackingFlags20260731131000 } from "./20260731131000-harden-sale-order-tracking-flags";

describe("HardenSaleOrderTrackingFlags20260731131000", () => {
  it("is registered in the TypeORM migration list", () => {
    expect(databaseMigrations).toContain(HardenSaleOrderTrackingFlags20260731131000);
  });

  it("normalizes null flags before enforcing boolean defaults and not-null", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new HardenSaleOrderTrackingFlags20260731131000();

    await migration.up(queryRunner as never);
    const upSql = queries.join("\n");
    const preparedNullIndex = queries.findIndex((sql) => sql.includes("prepared IS NULL"));
    const preparedDefaultIndex = queries.findIndex((sql) => sql.includes("prepared SET DEFAULT"));
    const preparedNotNullIndex = queries.findIndex((sql) => sql.includes("prepared SET NOT NULL"));
    const preguideNullIndex = queries.findIndex((sql) => sql.includes("preguide IS NULL"));
    const preguideDefaultIndex = queries.findIndex((sql) => sql.includes("preguide SET DEFAULT"));
    const preguideNotNullIndex = queries.findIndex((sql) => sql.includes("preguide SET NOT NULL"));

    expect(upSql).toContain("UPDATE sale_orders SET prepared = false WHERE prepared IS NULL");
    expect(upSql).toContain("UPDATE sale_orders SET preguide = false WHERE preguide IS NULL");
    expect(upSql).toContain("ALTER TABLE sale_orders ALTER COLUMN prepared SET DEFAULT false");
    expect(upSql).toContain("ALTER TABLE sale_orders ALTER COLUMN prepared SET NOT NULL");
    expect(upSql).toContain("ALTER TABLE sale_orders ALTER COLUMN preguide SET DEFAULT false");
    expect(upSql).toContain("ALTER TABLE sale_orders ALTER COLUMN preguide SET NOT NULL");
    expect(preparedNullIndex).toBeLessThan(preparedDefaultIndex);
    expect(preparedDefaultIndex).toBeLessThan(preparedNotNullIndex);
    expect(preguideNullIndex).toBeLessThan(preguideDefaultIndex);
    expect(preguideDefaultIndex).toBeLessThan(preguideNotNullIndex);

    queries.length = 0;
    await migration.down(queryRunner as never);
    const downSql = queries.join("\n");

    expect(downSql).toContain("ALTER TABLE sale_orders ALTER COLUMN prepared DROP NOT NULL");
    expect(downSql).toContain("ALTER TABLE sale_orders ALTER COLUMN preguide DROP NOT NULL");
    expect(downSql).not.toContain("DROP COLUMN");
  });
});
