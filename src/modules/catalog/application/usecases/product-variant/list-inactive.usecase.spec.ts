import { ListInactiveProductVariants } from './list-inactive.usecase';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('ListInactiveProductVariants', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const variantUuid = '22222222-2222-4222-8222-222222222222';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('lista variantes inactivas por producto', async () => {
    const variantRepo = {
      listInactiveByProductId: jest.fn().mockResolvedValue([
        new ProductVariant(
          variantUuid,
          ProductId.create(productUuid),
          'CAB-00002',
          '0002',
          { color: 'Blanco' },
          Money.create(9),
          Money.create(4),
          false,
          new Date('2026-02-10T12:00:00Z'),
          baseUnitId,
        ),
      ]),
    };

    const useCase = new ListInactiveProductVariants(variantRepo as any);

    const result = await useCase.execute({ productId: productUuid });

    expect(variantRepo.listInactiveByProductId).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: variantUuid,
        productId: productUuid,
        baseUnitId,
        sku: 'CAB-00002',
        barcode: '0002',
        attributes: { color: 'Blanco' },
        price: 9,
        cost: 4,
        isActive: false,
        createdAt: new Date('2026-02-10T12:00:00Z'),
      },
    ]);
  });
});
