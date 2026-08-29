export const BUSINESS_TIME_ZONE = 'America/Lima';

export function businessDateAsUtcMidnight(now = new Date()): Date {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('La fecha de negocio es invalida');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get('year');
  const month = byType.get('month');
  const day = byType.get('day');

  if (!year || !month || !day) {
    throw new RangeError('No se pudo determinar la fecha de negocio');
  }

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}
