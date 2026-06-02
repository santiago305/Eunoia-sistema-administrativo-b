import { Buffer } from "buffer";

export function fixMojibake(value: string): string {
  if (!value) return value;
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

export function normalizeTextForMatch(value: unknown): string {
  const text = fixMojibake(String(value ?? ""));
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizePhone(value: unknown, minDigits = 7): string {
  const digits = fixMojibake(String(value ?? "")).replace(/\D/g, "");
  return digits.length >= minDigits ? digits : "";
}

export function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = fixMojibake(String(value ?? "")).trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  let normalized = cleaned;
  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (hasComma && !hasDot) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function truncate(value: unknown, maxLen: number): string {
  const text = fixMojibake(String(value ?? "")).trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

