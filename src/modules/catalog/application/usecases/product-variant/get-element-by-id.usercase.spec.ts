import { NotFoundException } from '@nestjs/common';
import { GetProductVariant } from './get-element-by-id.usercase';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';

describe('GetProductVariant', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const variantUuid = '22222222-2222-4222-8222-222222222222';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('lanza error si no existe', async () => {
    const variantRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetProductVariant(variantRepo as any);

    await expect(useCase.execute({ id: variantUuid })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retorna variante mapeada', async () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const variant = new ProductVariant(
      variantUuid,
      ProductId.create(productUuid),
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      now,
      baseUnitId,
    );

    const variantRepo = {
      findById: jest.fn().mockResolvedValue(variant),
    };

    const useCase = new GetProductVariant(variantRepo as any);

    const result = await useCase.execute({ id: variantUuid });

    expect(result).toEqual({
      id: variantUuid,
      productId: productUuid,
      baseUnitId,
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: 10,
      cost: 5,
      isActive: true,
      createdAt: now,
    });
  });
});
