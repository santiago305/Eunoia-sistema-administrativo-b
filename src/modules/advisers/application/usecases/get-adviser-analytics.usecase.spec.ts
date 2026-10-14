import { GetAdviserAnalyticsUsecase } from './get-adviser-analytics.usecase';

describe('GetAdviserAnalyticsUsecase currencies', () => {
  it('queries and returns monthly financial metrics/trends independently per currency', async () => {
    const query = jest.fn().mockResolvedValue([
      { monthKey: '2026-09', currency: 'PEN', orders: '1', soldTotal: '100', collectedTotal: '50' },
      { monthKey: '2026-10', currency: 'PEN', orders: '1', soldTotal: '200', collectedTotal: '100' },
      { monthKey: '2026-09', currency: 'USD', orders: '1', soldTotal: '10', collectedTotal: '10' },
      { monthKey: '2026-10', currency: 'USD', orders: '2', soldTotal: '20', collectedTotal: '20' },
    ]);
    const usecase = new GetAdviserAnalyticsUsecase(
      { query } as never,
      { findOne: jest.fn().mockResolvedValue({ userId: 'adviser-1' }) } as never,
    );

    const result = await usecase.execute({ adviserUserId: 'adviser-1', months: 3 });

    expect(query.mock.calls[0][0]).toContain('FULL OUTER JOIN collected USING ("monthKey", currency)');
    expect(query.mock.calls[0][0]).toContain('sp.currency');
    expect(result.currencies).toEqual(['PEN', 'USD']);
    expect(result.items).toHaveLength(4);
    expect(result.items.find((item) => item.currency === 'PEN' && item.monthKey === '2026-09')).toMatchObject({ soldTotal: 100, collectedTotal: 50, collectionRate: 50 });
    expect(result.items.find((item) => item.currency === 'USD' && item.monthKey === '2026-09')).toMatchObject({ soldTotal: 10, collectedTotal: 10, collectionRate: 100 });
    expect(result.trends).toHaveProperty('PEN');
    expect(result.trends).toHaveProperty('USD');
  });
});
