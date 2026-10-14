import { calculateSaleOrderTotals } from './sale-order-totals';

describe('calculateSaleOrderTotals', () => {
  it('sums and subtracts currency amounts as integer minor units', () => {
    expect(calculateSaleOrderTotals({
      itemTotals: ['0.10', '0.20', '19.99'],
      deliveryCost: '0.10',
      discount: '0.09',
    })).toEqual({
      subTotal: 20.29,
      deliveryCost: 0.1,
      discount: 0.09,
      total: 20.3,
    });
  });

  it('normalizes all persisted money fields to two decimals and does not allow a negative total', () => {
    expect(calculateSaleOrderTotals({
      itemTotals: ['0.004', '0.004'],
      deliveryCost: '0.004',
      discount: '10.00',
    })).toEqual({
      subTotal: 0,
      deliveryCost: 0,
      discount: 10,
      total: 0,
    });
  });
});
