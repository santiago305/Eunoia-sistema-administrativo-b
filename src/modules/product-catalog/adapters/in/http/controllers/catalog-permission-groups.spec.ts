import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  documentExportPermissionGroupsFromRequest,
  documentPermissionGroupsFromRequest,
  inventoryExportPermissionGroupsFromRequest,
  inventoryPermissionGroupsFromRequest,
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

  it("allows sale-order product reads only for finished products", () => {
    expect(productCatalogPermissionGroupsFromRequest("view_detail")({ query: { type: ProductCatalogProductType.PRODUCT } }))
      .toEqual([["products.view_detail", "sale_orders.products.view"]]);
    expect(productCatalogPermissionGroupsFromRequest("view_detail")({ query: { type: ProductCatalogProductType.MATERIAL } }))
      .toEqual([["materials.view_detail"]]);
    expect(inventoryPermissionGroupsFromRequest("view")({ query: { productType: ProductCatalogProductType.PRODUCT } }))
      .toEqual([["inventory.products.view", "catalog.read", "sale_orders.stock.view"]]);
    expect(inventoryPermissionGroupsFromRequest("view")({ query: { productType: ProductCatalogProductType.MATERIAL } }))
      .toEqual([["inventory.materials.view", "catalog.read"]]);
  });

  it("maps supplies to their own catalog, inventory and document permissions", () => {
    expect(productCatalogPermissionGroupsFromRequest("create")({ body: { type: ProductCatalogProductType.SUPPLY } }))
      .toEqual([["supplies.create"]]);
    expect(inventoryPermissionGroupsFromRequest("view")({ query: { productType: ProductCatalogProductType.SUPPLY } }))
      .toEqual([["inventory.supplies.view", "catalog.read"]]);
    expect(documentPermissionGroupsFromRequest("process")({
      body: { docType: DocType.TRANSFER, productType: ProductCatalogProductType.SUPPLY },
    })).toEqual([["transfers.supplies.process"]]);
  });

  it("allows order editors to search supplies without catalog administration", () => {
    expect(productCatalogPermissionGroupsFromRequest("view_detail")({
      query: { productType: ProductCatalogProductType.SUPPLY },
    })).toEqual([["supplies.view_detail", "sale_orders.supplies.view"]]);
  });
});
