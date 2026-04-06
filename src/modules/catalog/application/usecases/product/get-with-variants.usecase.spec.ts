import { NotFoundException } from '@nestjs/common';
import { GetProductWithVariants } from './get-with-variants.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

describe('GetProductWithVariants', () => {
  it('lanza error cuando no existe', async () => {
    const productRepo = {
      getByIdWithVariants: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetProductWithVariants(productRepo as any);

    await expect(
      useCase.execute({ id: '11111111-1111-4111-8111-111111111111' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mapea producto y variantes', async () => {
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const baseUnitId = '33333333-3333-4333-8333-333333333333';
    const product = Product.create({
      id: productId,
      name: 'Cable',
      description: 'Cable USB',
      baseUnitId,
      sku: '00001',
      price: Money.create(10),
      cost: Money.create(5),
      attributes: {},
      isActive: true,
      type: ProductType.FINISHED,
      createdAt: new Date('2026-02-10T10:00:00Z'),
      updatedAt: new Date('2026-02-10T11:00:00Z'),
    });
    const variant = ProductVariant.create({
      id: '22222222-2222-4222-8222-222222222222',
      productId,
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: Money.create(10),
      cost: Money.create(5),
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });

    const productRepo = {
      getByIdWithVariants: jest.fn().mockResolvedValue({
        product,
        items: [variant],
      }),
    };

    const useCase = new GetProductWithVariants(productRepo as any);

    const result = await useCase.execute({ id: productId.value });

    expect(result).toEqual({
      product: {
        id: productId.value,
        name: 'Cable',
        description: 'Cable USB',
        baseUnitId,
        sku: '00001',
        barcode: null,
        customSku: null,
        price: 10,
        cost: 5,
        attributes: {},
        type: ProductType.FINISHED,
        isActive: true,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
      variants: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          productId: productId.value,
          sku: 'CAB-00001',
          customSku: null,
          barcode: '0001',
          attributes: { color: 'Negro' },
          price: 10,
          cost: 5,
          isActive: true,
          createdAt: new Date('2026-02-10T12:00:00Z'),
        },
      ],
    });
  });
});
