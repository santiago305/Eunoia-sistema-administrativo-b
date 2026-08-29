import { businessDateAsUtcMidnight } from './business-date';

describe('businessDateAsUtcMidnight', () => {
  it('keeps the Lima calendar day when UTC is already on the next day', () => {
    const result = businessDateAsUtcMidnight(
      new Date('2026-08-30T01:30:00.000Z'),
    );

    expect(result.toISOString()).toBe('2026-08-29T00:00:00.000Z');
  });

  it('changes the business date at midnight in Lima', () => {
    const result = businessDateAsUtcMidnight(
      new Date('2026-08-30T05:00:00.000Z'),
    );

    expect(result.toISOString()).toBe('2026-08-30T00:00:00.000Z');
  });
});
