export type SaleOrderItemDisplayComponent = {
  customSku: string | null;
  name: string | null;
  attributes?: Array<{ value: string }>;
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

const normalizeDisplayText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const normalizeForComparison = (value: string): string =>
  normalizeDisplayText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const containsWholeValue = (text: string, value: string): boolean =>
  text === value ||
  text.startsWith(`${value} `) ||
  text.endsWith(` ${value}`) ||
  text.includes(` ${value} `);

function buildComponentDisplayName(
  name: string,
  attributes: Array<{ value: string }> = [],
): string {
  const displayName = normalizeDisplayText(name);
  const comparisonName = normalizeForComparison(displayName);
  const seen = new Set<string>();
  const attributeValues = attributes
    .map((attribute) => normalizeDisplayText(attribute.value ?? ""))
    .filter(Boolean)
    .filter((value) => {
      const normalizedValue = normalizeForComparison(value);
      if (!normalizedValue || seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return !containsWholeValue(comparisonName, normalizedValue);
    });

  return [displayName, ...attributeValues].join(" ");
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
      const name = buildComponentDisplayName(component.name!, component.attributes);
      return `${name} x ${formatSaleOrderDisplayQuantity(component.quantity)}`;
    })
    .join("; ");

  return { SKUS, detail };
}
