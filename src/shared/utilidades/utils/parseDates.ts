export function ParseDateLocal(input?: string, kind: 'start' | 'end' = 'start'): Date | undefined {
  if (!input) return undefined;

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    if (kind === 'end') {
      return new Date(`${input}T23:59:59.999-05:00`); // fin del día Lima
    }
    return new Date(`${input}T00:00:00.000-05:00`);   // inicio del día Lima
  }

  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt;
}
