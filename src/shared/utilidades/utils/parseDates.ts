export function parseDateLocal(input?: string): Date | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(input);
}
