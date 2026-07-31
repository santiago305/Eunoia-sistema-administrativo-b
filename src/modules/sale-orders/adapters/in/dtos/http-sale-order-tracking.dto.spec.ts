import { validate } from 'class-validator';
import { HttpSaleOrderTrackingDto } from './http-sale-order-tracking.dto';

describe('HttpSaleOrderTrackingDto', () => {
  it('rejects string booleans and an empty change', async () => {
    const dto = Object.assign(new HttpSaleOrderTrackingDto(), {
      saleOrderIds: ['550e8400-e29b-41d4-a716-446655440000'],
      preguide: 'true',
    });
    expect((await validate(dto)).some((error) => error.property === 'preguide')).toBe(true);
  });

  it('accepts either explicit boolean indicator', async () => {
    const dto = Object.assign(new HttpSaleOrderTrackingDto(), {
      saleOrderIds: ['550e8400-e29b-41d4-a716-446655440000'],
      prepared: false,
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});
