import { RestoreLegacyProductEquivalenceDirection20260806110000 } from "./20260806110000-restore-legacy-product-equivalence-direction";

describe("RestoreLegacyProductEquivalenceDirection20260806110000", () => {
  it("removes direction triggers and restores base-unit origin equivalences", async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new RestoreLegacyProductEquivalenceDirection20260806110000().up({ query } as any);

    const sql = query.mock.calls.map(([statement]) => statement).join("\n");
    expect(sql).toContain("DROP TRIGGER IF EXISTS trg_validate_product_equivalence_base_unit");
    expect(sql).toContain("current_direction.to_unit_id = product.base_unit_id");
    expect(sql).toContain("from_unit_id = equivalence.to_unit_id");
    expect(sql).toContain("to_unit_id = equivalence.from_unit_id");
    expect(sql).toContain("No se pueden restaurar equivalencias");
  });
});
