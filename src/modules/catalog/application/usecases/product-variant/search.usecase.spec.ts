import { SearchProductVariants } from './search.usecase';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('SearchProductVariants', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const variantUuid = '22222222-2222-4222-8222-222222222222';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('busca variantes y mapea salida', async () => {
    const variant = new ProductVariant(
      variantUuid,
      ProductId.create(productUuid),
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
      baseUnitId,
    );

    const variantRepo = {
      search: jest.fn().mockResolvedValue({
        items: [
          {
            variant,
            productName: 'Cable',
            productDescription: 'Cable USB',
          },
        ],
        total: 1,
      }),
    };

    const useCase = new SearchProductVariants(variantRepo as any);

    const result = await useCase.execute({ productId: productUuid } as any);

    expect(variantRepo.search).toHaveBeenCalledTimes(1);
    expect((variantRepo.search as jest.Mock).mock.calls[0][0].productId.value).toBe(productUuid);
    expect(result).toEqual({
      items: [
        {
          id: variantUuid,
          productId: productUuid,
          baseUnitId,
          sku: 'CAB-00001',
          barcode: '0001',
          attributes: { color: 'Negro' },
          price: 10,
          cost: 5,
          isActive: true,
          createdAt: new Date('2026-02-10T12:00:00Z'),
          productName: 'Cable',
          productDescription: 'Cable USB',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  });
});
