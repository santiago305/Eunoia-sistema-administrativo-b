import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  HttpSaleOrderItemComponentDto,
  HttpSaleOrderItemDto,
} from './http-sale-order-create.dto';

describe('HttpSaleOrderCreateDto numeric precision', () => {
  it.each([
    [HttpSaleOrderItemDto, { quantity: 1.234, unitPrice: 10, total: 10 }],
    [
      HttpSaleOrderItemComponentDto,
      {
        skuId: '7a1282f2-c567-4ccc-8a36-5a934dd8ad58',
        quantity: 1.234,
        unitPrice: 10,
        total: 10,
      },
    ],
  ])('rejects quantities with more than two decimals', async (Dto, input) => {
    const errors = await validate(plainToInstance(Dto, input));

    expect(errors.some((error) => error.property === 'quantity')).toBe(true);
  });

  it.each([HttpSaleOrderItemDto, HttpSaleOrderItemComponentDto])(
    'accepts quantities with up to two decimals',
    async (Dto) => {
      const input = {
        quantity: 1.23,
        unitPrice: 10.25,
        total: 12.61,
        ...(Dto === HttpSaleOrderItemComponentDto
          ? { skuId: '7a1282f2-c567-4ccc-8a36-5a934dd8ad58' }
          : {}),
      };

      const errors = await validate(plainToInstance(Dto, input));

      expect(errors).toHaveLength(0);
    },
  );
});
