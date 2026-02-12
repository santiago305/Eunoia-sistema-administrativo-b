import { ListInactiveProductVariants } from './list-inactive.usecase';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

describe('ListInactiveProductVariants', () => {
  it('lista variantes inactivas por producto', async () => {
    const variantRepo = {
      listInactiveByProductId: jest.fn().mockResolvedValue([
        {
          id: 'VAR-2',
          product_id: { value: 'PROD-1' },
          sku: 'CAB-00002',
          barcode: '0002',
          attributes: 'Color=Blanco',
          price: new Money(9),
          cost: new Money(4),
          isActive: false,
          createdAt: new Date('2026-02-10T12:00:00Z'),
        },
      ]),
    };

    const useCase = new ListInactiveProductVariants(variantRepo as any);

    const result = await useCase.execute({ productId: 'PROD-1' } as any);

    expect(variantRepo.listInactiveByProductId).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'VAR-2',
        productId: 'PROD-1',
        sku: 'CAB-00002',
        barcode: '0002',
        attributes: 'Color=Blanco',
        price: 9,
        cost: 4,
        isActive: false,
        createdAt: new Date('2026-02-10T12:00:00Z'),
      },
    ]);
  });
});

