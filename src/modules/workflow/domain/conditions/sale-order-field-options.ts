export const SALE_ORDER_FIELD_OPTIONS = [
  { label: "Cliente tiene DNI", value: "client.docNumber", reason: "DNI requerido" },
  { label: "Cliente tiene direccion", value: "client.address", reason: "Direccion requerida" },
  { label: "Cliente tiene departamento", value: "client.deparmentId",reason:"Departamento requerido" },
  { label: "Cliente tiene provincia", value: "client.provinceId",reason:"Provincia requerido"},
  { label: "Cliente tiene distrito", value: "client.districtId",reason:"Distrito requerido" },
  { label: "Cliente tiene referencia", value: "client.reference",reason:"Referencia requerida" },
  { label: "Pedido tiene fecha de entrega", value: "deliveryDate",reason:"Fecha de entrega requerida" },
  { label: "Pedido tiene fecha de agenda", value: "scheduleDate",reason:"Fecha de agenda requerida" },
  { label: "Pedido tiene almacen", value: "warehouseId",reason:"Almacen requerido" },
  { label: "Pedido tiene enganche", value: "sourceId",reason:"Enganche requerido" },
  { label: "Pedido tiene agencia/dirección exacta", value: "agencyDetail",reason:"Agencia/direccion exacta requerido" },
  { label: "Pedido tiene nota", value: "note", reason:"Nota requerida" },
] as const;

export type SaleOrderFieldValue = (typeof SALE_ORDER_FIELD_OPTIONS)[number]["value"];

const SALE_ORDER_FIELD_VALUES = new Set<string>(SALE_ORDER_FIELD_OPTIONS.map((option) => option.value));

export function isSaleOrderFieldValue(value: unknown): value is SaleOrderFieldValue {
  return typeof value === "string" && SALE_ORDER_FIELD_VALUES.has(value);
}

export function isPresentSaleOrderFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}
export function getSaleOrderFieldOption(value: SaleOrderFieldValue) {
  return SALE_ORDER_FIELD_OPTIONS.find((option) => option.value === value);
}