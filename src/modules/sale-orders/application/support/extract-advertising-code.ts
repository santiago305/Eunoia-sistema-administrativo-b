export function extractAdvertisingCode(value: unknown): string | null {
  const candidates = String(value ?? "")
    .match(/[A-Za-z0-9]+/g)
    ?.filter((candidate) => candidate.length > 12 && /\d/.test(candidate)) ?? [];

  return candidates.reduce<string | null>(
    (longest, candidate) => (!longest || candidate.length > longest.length ? candidate : longest),
    null,
  );
}
