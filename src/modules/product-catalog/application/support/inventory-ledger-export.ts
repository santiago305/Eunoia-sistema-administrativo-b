import { Direction } from "src/shared/domain/value-objects/direction";

export type InventoryLedgerExportColumn = {
  key: string;
  label: string;
};

export const INVENTORY_LEDGER_EXPORT_COLUMNS: InventoryLedgerExportColumn[] = [
  { key: "createdAt", label: "Fecha" },
  { key: "effectiveDate", label: "Fecha estimada" },
  { key: "skuCode", label: "SKU" },
  { key: "skuName", label: "Nombre SKU (detalles)" },
  { key: "quantity", label: "Cantidad" },
  { key: "warehouseName", label: "Almacén" },
  { key: "direction", label: "Entrada/Salida" },
];

type InventoryLedgerExportMovement = {
  createdAt?: Date | string | null;
  effectiveDate?: string | null;
  quantity?: number | null;
  direction?: Direction | string | null;
  warehouseName?: string | null;
  sku?: {
    backendSku?: string | null;
    customSku?: string | null;
    name?: string | null;
    attributes?: Array<{
      code?: string | null;
      value?: string | null;
    }> | null;
  } | null;
};

const preferredAttributeCodes = ["presentation", "variant", "color"];

const formatDateOnly = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (value ?? "");
};

const formatDetailedSkuName = (movement: InventoryLedgerExportMovement) => {
  const attributes = movement.sku?.attributes ?? [];
  const valuesByCode = new Map(
    attributes.map((attribute) => [attribute.code?.toLowerCase(), attribute.value?.trim()]),
  );
  const preferred = preferredAttributeCodes
    .map((code) => valuesByCode.get(code))
    .filter((value): value is string => Boolean(value));
  const remaining = attributes
    .filter((attribute) => !preferredAttributeCodes.includes(attribute.code?.toLowerCase() ?? ""))
    .map((attribute) => attribute.value?.trim())
    .filter((value): value is string => Boolean(value));
  const details = Array.from(new Set([...preferred, ...remaining]));

  return [movement.sku?.name?.trim(), ...details].filter(Boolean).join(" ");
};

export const buildInventoryLedgerExportRows = (
  movements: InventoryLedgerExportMovement[],
): Record<string, unknown>[] =>
  movements.map((movement) => ({
    createdAt: movement.createdAt ?? "",
    effectiveDate: formatDateOnly(movement.effectiveDate),
    skuCode: movement.sku?.customSku?.trim() || movement.sku?.backendSku?.trim() || "",
    skuName: formatDetailedSkuName(movement),
    quantity: movement.quantity ?? 0,
    warehouseName: movement.warehouseName?.trim() || "",
    direction:
      movement.direction === Direction.IN
        ? "Entrada"
        : movement.direction === Direction.OUT
          ? "Salida"
          : "",
  }));
