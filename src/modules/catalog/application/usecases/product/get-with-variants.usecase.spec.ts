import { GetProductWithVariants } from './get-with-variants.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('GetProductWithVariants', () => {
  it('retorna null cuando no existe', async () => {
    const productRepo = {
      getByIdWithVariants: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetProductWithVariants(productRepo as any);

    const result = await useCase.execute({ id: '11111111-1111-4111-8111-111111111111' });

    expect(result).toBeNull();
  });

  it('mapea producto y variantes', async () => {
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const product = new Product(
      productId,
      'Cable',
      'Cable USB',
      true,
      new Date('2026-02-10T10:00:00Z'),
      new Date('2026-02-10T11:00:00Z'),
    );
    const variant = new ProductVariant(
      '22222222-2222-4222-8222-222222222222',
      productId,
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
    );

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
        isActive: true,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
      variants: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          productId: productId.value,
          sku: 'CAB-00001',
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
