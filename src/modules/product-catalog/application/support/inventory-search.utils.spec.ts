import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import {
  buildInventorySearchLabel,
  sanitizeInventorySearchSnapshot,
} from "./inventory-search.utils";

describe("inventory search utils", () => {
  it.each(["include", "exclude"] as const)(
    "keeps SKU IN filters in %s mode",
    (mode) => {
      const snapshot = sanitizeInventorySearchSnapshot({
        filters: [{
          field: "sku",
          operator: "IN",
          mode,
          values: ["sku-1", "sku-1", "sku-2"],
        }],
      });

      expect(snapshot.filters).toEqual([{
        field: "sku",
        operator: "IN",
        mode,
        values: ["sku-1", "sku-2"],
      }]);
    },
  );

  it("describes an excluded SKU selection", () => {
    const snapshot = sanitizeInventorySearchSnapshot({
      filters: [{
        field: "sku",
        operator: "IN",
        mode: "exclude",
        values: ["sku-1"],
      }],
    });

    expect(buildInventorySearchLabel(
      snapshot,
      { warehouses: new Map() },
      ProductCatalogProductType.MATERIAL,
    )).toBe("Excluye: sku-1");
  });
});
