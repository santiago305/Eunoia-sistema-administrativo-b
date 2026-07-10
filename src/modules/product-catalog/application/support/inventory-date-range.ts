const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LIMA_UTC_OFFSET_HOURS = 5;

export function parseInventoryRangeDate(
  value: string | undefined,
  boundary: "start" | "endExclusive",
): Date | undefined | null {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const dateOnly = DATE_ONLY_PATTERN.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(Date.UTC(year, month - 1, day, LIMA_UTC_OFFSET_HOURS, 0, 0, 0));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    if (boundary === "endExclusive") {
      date.setUTCDate(date.getUTCDate() + 1);
    }

    return date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}
