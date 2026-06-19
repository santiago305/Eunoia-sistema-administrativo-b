import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  documentExportPermissionGroupsFromRequest,
  documentPermissionGroupsFromRequest,
  inventoryExportPermissionGroupsFromRequest,
  ledgerExportPermissionGroupsFromRequest,
  productCatalogPermissionGroupsFromRequest,
} from "./catalog-permission-groups";

describe("catalog permission group resolvers", () => {
  it("does not add legacy manage permissions to product actions", () => {
    expect(productCatalogPermissionGroupsFromRequest("create")({ body: { type: ProductCatalogProductType.PRODUCT } })).toEqual([
      ["products.create"],
    ]);
    expect(productCatalogPermissionGroupsFromRequest("update")({ body: { type: ProductCatalogProductType.MATERIAL } })).toEqual([
      ["materials.update"],
    ]);
    expect(productCatalogPermissionGroupsFromRequest("export")({ query: { type: ProductCatalogProductType.PRODUCT } })).toEqual([
      ["products.export"],
    ]);
  });

  it("does not add catalog export fallback to inventory and ledger exports", () => {
    expect(inventoryExportPermissionGroupsFromRequest()({ query: { productType: ProductCatalogProductType.PRODUCT } })).toEqual([
      ["inventory.products.export"],
    ]);
    expect(ledgerExportPermissionGroupsFromRequest()({ query: { productType: ProductCatalogProductType.MATERIAL } })).toEqual([
      ["inventory-ledger.materials.export"],
    ]);
  });

  it("does not add legacy manage or export permissions to document actions", () => {
    expect(
      documentPermissionGroupsFromRequest("create")({
        body: { docType: DocType.TRANSFER, productType: ProductCatalogProductType.PRODUCT },
      }),
    ).toEqual([["transfers.products.create"]]);

    expect(
      documentPermissionGroupsFromRequest("process")({
        body: { docType: DocType.ADJUSTMENT, productType: ProductCatalogProductType.MATERIAL },
      }),
    ).toEqual([["adjustments.materials.process"]]);

    expect(
      documentExportPermissionGroupsFromRequest()({
        query: { docType: DocType.TRANSFER, productType: ProductCatalogProductType.MATERIAL },
      }),
    ).toEqual([["transfers.materials.export"]]);
  });
});
