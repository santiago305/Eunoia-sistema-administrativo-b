import { PermissionGroup } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import { DocType } from "src/shared/domain/value-objects/doc-type";

type RequestLike = {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

type ProductScopedAction =
  | "view"
  | "view_detail"
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "export";

type InventoryAction = "view" | "export";
type LedgerAction = "view" | "export";
type DocumentAction = "view" | "create" | "process" | "cancel" | "export";

const PRODUCT_TYPE_PRODUCT_VALUES = new Set(["PRODUCT", "FINISHED"]);
const PRODUCT_TYPE_MATERIAL_VALUES = new Set(["MATERIAL", "PRIMA", "RAW_MATERIAL"]);

export const legacyReadGroup = (permission: string): PermissionGroup => [permission, "catalog.read"];
export const legacyManageGroup = (permission: string): PermissionGroup => [permission, "catalog.manage"];
export const legacyExportGroup = (permission: string): PermissionGroup => [permission, "catalog.export"];
export const legacyPackReadGroup = (permission: string): PermissionGroup => [permission, "packs.read"];
export const legacyPackManageGroup = (permission: string): PermissionGroup => [permission, "packs.manage"];

export function productCatalogPermissionGroups(action: ProductScopedAction, legacyPermission: string): PermissionGroup[] {
  return resolveByProductType(action, legacyPermission, "products", "materials");
}

export function productCatalogPermissionGroupsFromRequest(action: ProductScopedAction, legacyPermission: string) {
  return (request: RequestLike) =>
    resolveByProductType(action, legacyPermission, "products", "materials", getProductTypeFromRequest(request, "type"));
}

export function inventoryPermissionGroupsFromRequest(action: InventoryAction) {
  return (request: RequestLike) =>
    resolveByProductType(action, "catalog.read", "inventory.products", "inventory.materials", getProductTypeFromRequest(request));
}

export function inventoryExportPermissionGroupsFromRequest() {
  return (request: RequestLike) =>
    resolveByProductType("export", "catalog.export", "inventory.products", "inventory.materials", getProductTypeFromRequest(request));
}

export function ledgerPermissionGroupsFromRequest(action: LedgerAction) {
  return (request: RequestLike) =>
    resolveByProductType(action, "catalog.read", "inventory-ledger.products", "inventory-ledger.materials", getProductTypeFromRequest(request));
}

export function ledgerExportPermissionGroupsFromRequest() {
  return (request: RequestLike) =>
    resolveByProductType("export", "catalog.export", "inventory-ledger.products", "inventory-ledger.materials", getProductTypeFromRequest(request));
}

export function documentPermissionGroupsFromRequest(action: DocumentAction) {
  return (request: RequestLike) => {
    const productType = getProductTypeFromRequest(request);
    const docType = normalizeDocType(getString(request.body?.docType) ?? getString(request.query?.docType));

    if (docType === DocType.TRANSFER) {
      return resolveByProductType(action, "catalog.manage", "transfers.products", "transfers.materials", productType);
    }
    if (docType === DocType.ADJUSTMENT) {
      return resolveByProductType(action, "catalog.manage", "adjustments.products", "adjustments.materials", productType);
    }

    return [[`transfers.products.${action}`, `transfers.materials.${action}`, `adjustments.products.${action}`, `adjustments.materials.${action}`, "catalog.manage"]];
  };
}

export function documentReadPermissionGroupsFromRequest() {
  return (request: RequestLike) => {
    const productType = getProductTypeFromRequest(request);
    const docType = normalizeDocType(getString(request.body?.docType) ?? getString(request.query?.docType));

    if (docType === DocType.TRANSFER) {
      return resolveByProductType("view", "catalog.read", "transfers.products", "transfers.materials", productType);
    }
    if (docType === DocType.ADJUSTMENT) {
      return resolveByProductType("view", "catalog.read", "adjustments.products", "adjustments.materials", productType);
    }

    return [[
      "transfers.products.view",
      "transfers.materials.view",
      "adjustments.products.view",
      "adjustments.materials.view",
      "catalog.read",
    ]];
  };
}

export function documentExportPermissionGroupsFromRequest() {
  return (request: RequestLike) => {
    const productType = getProductTypeFromRequest(request);
    const docType = normalizeDocType(getString(request.body?.docType) ?? getString(request.query?.docType));

    if (docType === DocType.TRANSFER) {
      return resolveByProductType("export", "catalog.export", "transfers.products", "transfers.materials", productType);
    }
    if (docType === DocType.ADJUSTMENT) {
      return resolveByProductType("export", "catalog.export", "adjustments.products", "adjustments.materials", productType);
    }

    return [[
      "transfers.products.export",
      "transfers.materials.export",
      "adjustments.products.export",
      "adjustments.materials.export",
      "catalog.export",
    ]];
  };
}

function resolveByProductType(
  action: string,
  legacyPermission: string,
  productPrefix: string,
  materialPrefix: string,
  productType?: ProductCatalogProductType,
): PermissionGroup[] {
  if (productType === ProductCatalogProductType.MATERIAL) {
    return [[`${materialPrefix}.${action}`, legacyPermission]];
  }
  if (productType === ProductCatalogProductType.PRODUCT) {
    return [[`${productPrefix}.${action}`, legacyPermission]];
  }

  return [
    [`${productPrefix}.${action}`, legacyPermission],
    [`${materialPrefix}.${action}`, legacyPermission],
  ];
}

function getProductTypeFromRequest(request: RequestLike, primaryKey = "productType"): ProductCatalogProductType | undefined {
  const raw =
    getString(request.body?.[primaryKey]) ??
    getString(request.query?.[primaryKey]) ??
    getString(request.body?.productType) ??
    getString(request.query?.productType) ??
    getString(request.body?.type) ??
    getString(request.query?.type);
  return normalizeProductType(raw);
}

function normalizeProductType(value?: string): ProductCatalogProductType | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (PRODUCT_TYPE_MATERIAL_VALUES.has(normalized)) return ProductCatalogProductType.MATERIAL;
  if (PRODUCT_TYPE_PRODUCT_VALUES.has(normalized)) return ProductCatalogProductType.PRODUCT;
  return undefined;
}

function normalizeDocType(value?: string): DocType | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === DocType.TRANSFER) return DocType.TRANSFER;
  if (normalized === DocType.ADJUSTMENT) return DocType.ADJUSTMENT;
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
