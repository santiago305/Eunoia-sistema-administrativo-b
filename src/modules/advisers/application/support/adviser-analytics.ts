import { BadRequestException } from '@nestjs/common';

export const ADVISER_ANALYTICS_MONTHS = [3, 6, 12] as const;
export type AdviserAnalyticsMonths = (typeof ADVISER_ANALYTICS_MONTHS)[number];

export type AdviserMonthlyAnalytics = {
  monthKey: string;
  orders: number;
  soldTotal: number;
  collectedTotal: number;
  collectionRate: number;
  performanceScore: number;
};

type AdviserMonthlyTotals = Pick<
  AdviserMonthlyAnalytics,
  'monthKey' | 'orders' | 'soldTotal' | 'collectedTotal'
>;

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const clampScore = (value: number) => Math.min(100, Math.max(0, value));

export const resolveAdviserAnalyticsMonths = (
  value?: number | string,
): AdviserAnalyticsMonths => {
  const parsed = Number(value ?? 6);
  if (!ADVISER_ANALYTICS_MONTHS.includes(parsed as AdviserAnalyticsMonths)) {
    throw new BadRequestException('El perÃ­odo debe ser de 3, 6 o 12 meses');
  }
  return parsed as AdviserAnalyticsMonths;
};

const bogotaDateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export const buildAdviserAnalyticsPeriod = (
  months: AdviserAnalyticsMonths,
  now = new Date(),
) => {
  const [year, month] = bogotaDateKey(now).split('-').map(Number);
  const monthKeys = Array.from({ length: months }, (_, index) => {
    const offset = index - (months - 1);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: `${monthKeys[0]}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    monthKeys,
  };
};

export const buildAdviserMonthlyAnalytics = (
  monthKeys: string[],
  rows: AdviserMonthlyTotals[],
): AdviserMonthlyAnalytics[] => {
  const rowsByMonth = new Map(rows.map((row) => [row.monthKey, row]));
  const totals = monthKeys.map((monthKey) => {
    const row = rowsByMonth.get(monthKey);
    return {
      monthKey,
      orders: Number(row?.orders ?? 0),
      soldTotal: Number(row?.soldTotal ?? 0),
      collectedTotal: Number(row?.collectedTotal ?? 0),
    };
  });
  const averageOrders =
    totals.reduce((sum, item) => sum + item.orders, 0) / totals.length;
  const averageSold =
    totals.reduce((sum, item) => sum + item.soldTotal, 0) / totals.length;

  return totals.map((item) => {
    const ordersScore = averageOrders
      ? clampScore((item.orders / averageOrders) * 50)
      : 0;
    const salesScore = averageSold
      ? clampScore((item.soldTotal / averageSold) * 50)
      : 0;
    const collectionRate = item.soldTotal
      ? clampScore((item.collectedTotal / item.soldTotal) * 100)
      : 0;
    const performanceScore =
      salesScore * 0.4 + collectionRate * 0.35 + ordersScore * 0.25;

    return {
      ...item,
      soldTotal: round(item.soldTotal, 2),
      collectedTotal: round(item.collectedTotal, 2),
      collectionRate: round(collectionRate, 1),
      performanceScore: round(performanceScore),
    };
  });
};

export const getAdviserPerformanceTrend = (
  points: AdviserMonthlyAnalytics[],
) => {
  const current = points[points.length - 1]?.performanceScore ?? 0;
  const previous = points[points.length - 2]?.performanceScore ?? 0;
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    direction:
      Math.abs(delta) < 2
        ? ('stable' as const)
        : delta > 0
          ? ('improved' as const)
          : ('worsened' as const),
  };
};
