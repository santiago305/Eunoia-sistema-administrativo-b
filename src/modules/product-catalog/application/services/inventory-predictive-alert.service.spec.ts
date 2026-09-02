import {
  calculatePredictiveAlert,
  InventoryPredictiveAlertService,
  previousBusinessDays,
} from './inventory-predictive-alert.service';

describe('inventory predictive alerts', () => {
  it('excludes Sunday from the rolling history', () => {
    expect(previousBusinessDays(3, new Date('2026-08-10T12:00:00Z'))).toEqual([
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
    ]);
  });

  it('does not alert while consumption average is zero', () => {
    expect(
      calculatePredictiveAlert({
        consumptions: [0, 0, 0],
        historyDays: 3,
        targetDays: 3,
        availableStock: 0,
        enabled: true,
      }).level,
    ).toBe('NORMAL');
  });

  it('includes zero days and warns when coverage is insufficient', () => {
    const result = calculatePredictiveAlert({
      consumptions: [6, 4, 5],
      historyDays: 3,
      targetDays: 3,
      availableStock: 10,
      enabled: true,
    });
    expect(result.averageDailyConsumption).toBe(5);
    expect(result.coverageDays).toBe(2);
    expect(result.shortage).toBe(5);
    expect(result.level).toBe('WARNING');
  });

  it('evaluates a full inventory page with a fixed number of database queries', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('CREATE TABLE')) return [];
      if (sql.includes('INSERT INTO pc_inventory_alert_policies')) return [];
      if (sql.includes('COALESCE(SUM(COALESCE(i.available')) {
        return Array.from({ length: 25 }, (_, index) => ({
          stockItemId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          warehouseId: '11111111-1111-4111-8111-111111111111',
          productType: 'PRODUCT',
          available: 10,
        }));
      }
      if (sql.includes('FROM pc_inventory_alert_policies')) {
        return [
          {
            productType: 'PRODUCT',
            historyDays: 3,
            coverageDays: 3,
            alertEnabled: true,
          },
        ];
      }
      if (sql.includes('JOIN pc_inventory_ledger')) return [];
      throw new Error(`Consulta inesperada: ${sql}`);
    });
    const service = new InventoryPredictiveAlertService({ query } as any);
    const items = Array.from({ length: 25 }, (_, index) => ({
      stockItemId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      warehouseId: '11111111-1111-4111-8111-111111111111',
    }));

    const result = await service.evaluateBatch(items);

    expect(result).toHaveLength(25);
    expect(query).toHaveBeenCalledTimes(5);
  });
});
