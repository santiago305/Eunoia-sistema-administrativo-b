import { fixMojibake } from "./normalization";

export type ParsedProductCode = {
  rawCode: string;
  productName: string;
  variantName: string | null;
  skuName: string;
  customSku: string;
  quantity: number;
};

export function parseProductCodes(
  input: unknown,
  parseExternalCode: (
    code: string,
  ) => Omit<ParsedProductCode, "rawCode" | "quantity">,
): ParsedProductCode[] {
  const text = fixMojibake(String(input ?? "")).trim();
  if (!text) return [];

  const items = text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(.+?)\s*x\s*(\d+(?:\.\d+)?)$/i);
      if (!match) return { rawCode: item.trim(), quantity: 1 };
      return { rawCode: match[1].trim(), quantity: Number(match[2]) };
    });

  const grouped = new Map<string, ParsedProductCode>();

  for (const item of items) {
    const parsed = parseExternalCode(item.rawCode);
    const current = grouped.get(parsed.customSku);

    if (current) current.quantity += item.quantity;
    else grouped.set(parsed.customSku, { ...parsed, rawCode: item.rawCode, quantity: item.quantity });
  }

  return Array.from(grouped.values());
}

