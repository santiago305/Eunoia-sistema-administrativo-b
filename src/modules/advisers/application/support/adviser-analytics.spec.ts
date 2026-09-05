import { BadRequestException } from '@nestjs/common';
import {
  buildAdviserAnalyticsPeriod,
  buildAdviserMonthlyAnalytics,
  getAdviserPerformanceTrend,
  resolveAdviserAnalyticsMonths,
} from './adviser-analytics';

describe('adviser analytics', () => {
  it('accepts only the supported periods', () => {
    expect(resolveAdviserAnalyticsMonths('3')).toBe(3);
    expect(resolveAdviserAnalyticsMonths(undefined)).toBe(6);
    expect(() => resolveAdviserAnalyticsMonths(4)).toThrow(BadRequestException);
  });

  it('builds a complete rolling period across years', () => {
    expect(
      buildAdviserAnalyticsPeriod(3, new Date('2026-01-15T12:00:00Z')),
    ).toEqual({
      startDate: '2025-11-01',
      endDate: '2026-01-31',
      monthKeys: ['2025-11', '2025-12', '2026-01'],
    });
  });

  it('fills empty months and calculates a comparable score', () => {
    const points = buildAdviserMonthlyAnalytics(
      ['2026-01', '2026-02', '2026-03'],
      [
        { monthKey: '2026-01', orders: 10, soldTotal: 1000, collectedTotal: 800 },
        { monthKey: '2026-03', orders: 20, soldTotal: 2000, collectedTotal: 2000 },
      ],
    );

    expect(points[1]).toMatchObject({
      monthKey: '2026-02',
      orders: 0,
      soldTotal: 0,
      collectedTotal: 0,
      performanceScore: 0,
    });
    expect(points[2].performanceScore).toBeGreaterThan(points[0].performanceScore);
    expect(getAdviserPerformanceTrend(points).direction).toBe('improved');
  });
});
