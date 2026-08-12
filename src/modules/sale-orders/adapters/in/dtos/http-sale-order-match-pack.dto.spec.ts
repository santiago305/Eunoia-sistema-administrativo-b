import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpSaleOrderMatchPackDto } from './http-sale-order-match-pack.dto';

const SKU_A = '11111111-1111-4111-8111-111111111111';
const SKU_B = '22222222-2222-4222-8222-222222222222';

describe('HttpSaleOrderMatchPackDto', () => {
  it('accepts a composition with quantities of at most two decimals', async () => {
    const dto = plainToInstance(HttpSaleOrderMatchPackDto, {
      components: [
        { skuId: SKU_A, quantity: 1 },
        { skuId: SKU_B, quantity: 2.5 },
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects quantities with more than two decimals', async () => {
    const dto = plainToInstance(HttpSaleOrderMatchPackDto, {
      components: [{ skuId: SKU_A, quantity: 1.234 }],
    });

    const errors = await validate(dto);

    expect(errors[0]?.children?.[0]?.children?.[0]?.constraints).toHaveProperty(
      'isNumber',
    );
  });

  it.each([
    [{ components: [] }, 'arrayMinSize'],
    [{ components: [{ skuId: 'not-a-uuid', quantity: 1 }] }, 'isUuid'],
    [{ components: [{ skuId: SKU_A, quantity: 0 }] }, 'min'],
  ])('rejects an invalid composition', async (input, constraint) => {
    const dto = plainToInstance(HttpSaleOrderMatchPackDto, input);
    const errors = await validate(dto);
    const serialized = JSON.stringify(errors);

    expect(serialized).toContain(constraint);
  });
});
