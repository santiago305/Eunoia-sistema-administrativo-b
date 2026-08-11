import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpSaleOrderSupplyDto } from './http-sale-order-create.dto';

const dto = (quantity: number) => plainToInstance(HttpSaleOrderSupplyDto, {
  supplySkuId: '8dd182ce-3033-4e3f-93f8-a3844a48d5ed',
  quantity,
  unitId: '958519b7-1fb6-4479-b4cc-a269080b7a21',
  referenceRecipeItemId: '6184a77f-d9e5-4cdd-9180-a6a27dad6dd4',
});

describe('HttpSaleOrderSupplyDto', () => {
  it('accepts quantities with at most two decimals', async () => {
    expect(await validate(dto(1.25))).toHaveLength(0);
  });

  it.each([0, 0.001, 1.234])('rejects invalid quantity %s', async (quantity) => {
    expect(await validate(dto(quantity))).not.toHaveLength(0);
  });
});
