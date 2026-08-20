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

export function normalizePhone(value: unknown): string {
  const digits = fixMojibake(String(value ?? "")).replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("0051")
    ? digits.slice(4)
    : digits.startsWith("51")
      ? digits.slice(2)
      : digits;

  return /^9\d{8}$/.test(withoutCountryCode) ? withoutCountryCode : "";
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

export function parseDateOnly(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number") return excelSerialToDate(value);

  const text = fixMojibake(String(value)).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[T\s])/);
  if (isoMatch) {
    return formatValidDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const separatedMatch = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|[T\s,])/);
  if (separatedMatch) {
    let first = Number(separatedMatch[1]);
    let second = Number(separatedMatch[2]);
    const rawYear = Number(separatedMatch[3]);
    const year = rawYear >= 100 ? rawYear : rawYear >= 70 ? 1900 + rawYear : 2000 + rawYear;

    if (second > 12 && first <= 12) {
      [first, second] = [second, first];
    }

    return formatValidDateParts(year, second, first);
  }

  if (/^\d+(?:\.\d+)?$/.test(text)) return excelSerialToDate(Number(text));

  return null;
}

function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;

  const utcMilliseconds = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const date = new Date(utcMilliseconds);
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function formatValidDateParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return formatDateParts(year, month, day);
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function truncate(value: unknown, maxLen: number): string {
  const text = fixMojibake(String(value ?? "")).trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

