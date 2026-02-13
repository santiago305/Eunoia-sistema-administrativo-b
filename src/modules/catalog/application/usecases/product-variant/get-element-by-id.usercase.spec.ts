import { BadRequestException } from '@nestjs/common';
import { GetProductVariant } from './get-element-by-id.usercase';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';

describe('GetProductVariant', () => {
  it('lanza error si no existe', async () => {
    const variantRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetProductVariant(variantRepo as any);

    await expect(
      useCase.execute({ id: 'VAR-1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retorna variante mapeada', async () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const variant = new ProductVariant(
      'VAR-1',
      ProductId.create('PROD-1'),
      'CAB-00001',
      '0001',
      'Color=Negro',
      Money.create(10),
      Money.create(5),
      true,
      now,
    );

    const variantRepo = {
      findById: jest.fn().mockResolvedValue(variant),
    };

    const useCase = new GetProductVariant(variantRepo as any);

    const result = await useCase.execute({ id: 'VAR-1' } as any);

    expect(result).toEqual({
      id: 'VAR-1',
      productId: 'PROD-1',
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: 'Color=Negro',
      price: 10,
      cost: 5,
      isActive: true,
      createdAt: now,
    });
  });
});

