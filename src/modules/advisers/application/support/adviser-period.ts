import { BadRequestException } from '@nestjs/common';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateKey = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const currentDateKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const resolveAdviserPeriod = (startDate?: string, endDate?: string) => {
  if (startDate || endDate) {
    if (!startDate || !endDate || !isValidDateKey(startDate) || !isValidDateKey(endDate)) {
      throw new BadRequestException('El período debe tener una fecha inicial y final válidas');
    }
    if (startDate > endDate) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la fecha final');
    }
    return { startDate, endDate };
  }

  const today = currentDateKey();
  const [year, month] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

export const adviserOrderPeriodSql = (alias: string) =>
  `${alias}.created_at >= :periodStart::date AND ${alias}.created_at < (:periodEnd::date + INTERVAL '1 day')`;
