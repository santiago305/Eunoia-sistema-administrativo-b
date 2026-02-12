import { ListProductVariants } from './list-by-product.usecase';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

describe('ListProductVariants', () => {
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
        {
          id: 'VAR-1',
          product_id: { value: 'PROD-1' },
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

    const useCase = new ListProductVariants(variantRepo as any);

    const result = await useCase.execute({ productId: 'PROD-1' } as any);

    expect(variantRepo.listByProductId).toHaveBeenCalledTimes(1);
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

