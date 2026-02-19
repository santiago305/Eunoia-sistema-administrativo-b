import { ListProductVariants } from './list-by-product.usecase';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('ListProductVariants', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const variantUuid = '22222222-2222-4222-8222-222222222222';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('retorna [] si no hay productId', async () => {
    const variantRepo = {
      listByProductId: jest.fn(),
    };

    const useCase = new ListProductVariants(variantRepo as any);

    const result = await useCase.execute({} as any);

    expect(result).toEqual([]);
    expect(variantRepo.listByProductId).not.toHaveBeenCalled();
  });

  it('lista variantes por producto', async () => {
    const variantRepo = {
      listByProductId: jest.fn().mockResolvedValue([
        new ProductVariant(
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
        ),
      ]),
    };

    const useCase = new ListProductVariants(variantRepo as any);

    const result = await useCase.execute({ productId: productUuid });

    expect(variantRepo.listByProductId).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
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
      },
    ]);
  });
});
