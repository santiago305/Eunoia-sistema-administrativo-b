import { GetProductWithVariants } from './get-with-variants.usecase';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

describe('GetProductWithVariants', () => {
  it('retorna null cuando no existe', async () => {
    const productRepo = {
      getByIdWithVariants: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetProductWithVariants(productRepo as any);

    const result = await useCase.execute({ id: 'PROD-1' } as any);

    expect(result).toBeNull();
  });

  it('mapea producto y variantes', async () => {
    const productRepo = {
      getByIdWithVariants: jest.fn().mockResolvedValue({
        product: {
          id: 'PROD-1',
          name: 'Cable',
          description: 'Cable USB',
          isActive: true,
          createdAt: new Date('2026-02-10T10:00:00Z'),
          updatedAt: new Date('2026-02-10T11:00:00Z'),
        },
        items: [
          {
            id: 'VAR-1',
            product_id: { value: 'PROD-1' },
            sku: 'CAB-00001',
            barcode: '0001',
            attributes: 'Color=Negro',
            price: Money.create(10),
            cost: Money.create(5),
            isActive: true,
            createdAt: new Date('2026-02-10T12:00:00Z'),
          },
        ],
      }),
    };

    const useCase = new GetProductWithVariants(productRepo as any);

    const result = await useCase.execute({ id: 'PROD-1' } as any);

    expect(result).toEqual({
      product: {
        id: 'PROD-1',
        name: 'Cable',
        description: 'Cable USB',
        isActive: true,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
      variants: [
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
      ],
    });
  });
});

