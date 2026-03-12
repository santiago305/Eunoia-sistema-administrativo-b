export type GroupByGranularity = '5min' | '15min' | '30min' | 'hour' | 'day';

export const SECURITY_TIMEZONE = 'America/Lima';

export function resolveWindow(hours?: number) {
  const requestedHours = Number.isFinite(hours) ? (hours as number) : 24;
  const safeHours = Math.min(24 * 30, Math.max(1, requestedHours));
  const to = new Date();
  const from = new Date(to.getTime() - safeHours * 60 * 60 * 1000);
  return { from, to, hours: safeHours };
}

export function buildReasonFilter(fieldName: string, reason?: string): { clause: string; bind: Record<string, string> } {
  const normalizedReason = reason?.trim();
  if (!normalizedReason) {
    return { clause: '1=1', bind: {} };
  }

  return { clause: `${fieldName} = :reason`, bind: { reason: normalizedReason } };
}

export function formatLocalDateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: SECURITY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function resolveRiskLevel(score: number): { level: 'LOW' | 'MEDIUM' | 'HIGH'; label: string } {
  if (score >= 67) return { level: 'HIGH', label: 'Alto' };
  if (score >= 34) return { level: 'MEDIUM', label: 'Medio' };
  return { level: 'LOW', label: 'Bajo' };
}

export function resolveFrontendRiskLabel(label: string): string {
  if (label === 'Bajo') return 'Bajo';
  if (label === 'Medio') return 'Moderado';
  return 'Alto';
}

export function toCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function humanizeReason(reason: string): string {
  return (reason || 'unknown')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
