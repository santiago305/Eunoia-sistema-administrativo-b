import { AlignProductEquivalencesToBaseUnit20260805000000 } from "./20260805000000-align-product-equivalences-to-base-unit";

describe("AlignProductEquivalencesToBaseUnit20260805000000", () => {
  it("inverts historical base-to-purchase rows and enforces base as destination", async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AlignProductEquivalencesToBaseUnit20260805000000();

    await migration.up({ query } as any);

    const sql = query.mock.calls.map(([statement]) => statement).join("\n");
    expect(sql).toContain("from_unit_id = equivalence.to_unit_id");
    expect(sql).toContain("to_unit_id = equivalence.from_unit_id");
    expect(sql).toContain("trg_validate_product_equivalence_base_unit");
    expect(sql).toContain("trg_prevent_product_base_unit_change_with_equivalences");
    expect(sql).toContain("NEW.base_unit_id IS DISTINCT FROM OLD.base_unit_id");
    expect(sql).toContain("ya existen ambos sentidos");
  });
});
