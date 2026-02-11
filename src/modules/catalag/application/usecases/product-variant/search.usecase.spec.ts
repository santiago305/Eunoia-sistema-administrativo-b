import { SearchProductVariants } from './search.usecase';
import { Money } from 'src/modules/catalag/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalag/domain/value-object/product.vo';

describe('SearchProductVariants', () => {
  it('busca variantes y mapea salida', async () => {
    const variantRepo = {
      search: jest.fn().mockResolvedValue([
        {
          id: 'VAR-1',
          productId: new ProductId('PROD-1'),
          sku: 'CAB-00001',
          barcode: '0001',
          attributes: 'Color=Negro',
          price: new Money(10),
          cost: new Money(5),
          isActive: true,
          createdAt: new Date('2026-02-10T12:00:00Z'),
        },
      ]),
    };

    const useCase = new SearchProductVariants(variantRepo as any);

    const result = await useCase.execute({ productId: 'PROD-1' } as any);

    expect(variantRepo.search).toHaveBeenCalledTimes(1);
    expect((variantRepo.search as jest.Mock).mock.calls[0][0].productId.value).toBe('PROD-1');
    expect(result).toEqual([
      {
        id: 'VAR-1',
        productId: 'PROD-1',
        sku: 'CAB-00001',
        barcode: '0001',
        attributes: 'Color=Negro',
        price: 10,
        cost: 5,
        isActive: true,
        createdAt: new Date('2026-02-10T12:00:00Z'),
      },
    ]);
  });
});
