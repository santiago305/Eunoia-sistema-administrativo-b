import { fixMojibake } from "./normalization";

export type ParsedProductCode = {
  rawCode: string;
  productName: string;
  variantName: string | null;
  skuName: string;
  customSku: string;
  quantity: number;
};

const MAX_QUANTITY_HUNDREDTHS = 999_999_999_999n;

function parseQuantityHundredths(value: string): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`La cantidad "${value}" no es válida.`);
  }

  const [wholePart, decimalPart = ""] = value.split(".");
  if (decimalPart.length > 2 && /[1-9]/.test(decimalPart.slice(2))) {
    throw new Error("La cantidad admite como máximo dos decimales.");
  }

  const hundredths = BigInt(wholePart) * 100n
    + BigInt(decimalPart.slice(0, 2).padEnd(2, "0") || "0");
  if (hundredths <= 0n) throw new Error("La cantidad debe ser mayor que cero.");
  if (hundredths > MAX_QUANTITY_HUNDREDTHS) {
    throw new Error("La cantidad supera el máximo permitido (9999999999.99).");
  }
  return hundredths;
}

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
      if (!match) return { rawCode: item.trim(), quantityHundredths: 100n };
      return { rawCode: match[1].trim(), quantityHundredths: parseQuantityHundredths(match[2]) };
    });

  const grouped = new Map<string, { item: ParsedProductCode; quantityHundredths: bigint }>();

  for (const item of items) {
    const parsed = parseExternalCode(item.rawCode);
    const current = grouped.get(parsed.customSku);

    if (current) {
      current.quantityHundredths += item.quantityHundredths;
      if (current.quantityHundredths > MAX_QUANTITY_HUNDREDTHS) {
        throw new Error("La cantidad acumulada de un producto supera el máximo permitido (9999999999.99).");
      }
    } else {
      grouped.set(parsed.customSku, {
        item: { ...parsed, rawCode: item.rawCode, quantity: 0 },
        quantityHundredths: item.quantityHundredths,
      });
    }
  }

  return Array.from(grouped.values(), ({ item, quantityHundredths }) => ({
    ...item,
    quantity: Number(quantityHundredths) / 100,
  }));
}

