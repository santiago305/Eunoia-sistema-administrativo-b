export type SaleOrderItemDisplayComponent = {
  customSku: string | null;
  name: string | null;
  quantity: number;
};

export type SaleOrderItemDisplayFields = {
  SKUS: string;
  detail: string;
};

export function formatSaleOrderDisplayQuantity(quantity: number): string {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

export function buildSaleOrderItemDisplayFields(
  components: SaleOrderItemDisplayComponent[],
): SaleOrderItemDisplayFields {
  const SKUS = components
    .filter((component) => Boolean(component.customSku?.trim()))
    .map((component) => {
      const customSku = component.customSku!.trim();
      return `${customSku}(${formatSaleOrderDisplayQuantity(component.quantity)})`;
    })
    .join(";");

  const detail = components
    .filter((component) => Boolean(component.name?.trim()))
    .map((component) => {
      const name = component.name!.replace(/\s+/g, "");
      return `${name}${formatSaleOrderDisplayQuantity(component.quantity)}`;
    })
    .join("");

  return { SKUS, detail };
}
