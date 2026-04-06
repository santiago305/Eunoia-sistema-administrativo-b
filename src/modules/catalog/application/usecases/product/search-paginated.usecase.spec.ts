/// <reference types="jest" />
import { SearchProductsPaginated } from './search-paginated.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

describe('SearchProductsPaginated', () => {
  it('usa paginacion por defecto y mapea resultados', async () => {
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const baseUnitId = '33333333-3333-4333-8333-333333333333';
    const productRepo = {
      searchPaginated: jest.fn().mockResolvedValue({
        items: [
          {
            product: Product.create({
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
            }),
            baseUnitName: 'Unidad',
            baseUnitCode: 'UND',
          },
        ],
        total: 1,
      }),
    };

    const useCase = new SearchProductsPaginated(productRepo as any);

    const result = await useCase.execute({} as any);

    expect(productRepo.searchPaginated).toHaveBeenCalledWith({
      isActive: undefined,
      name: undefined,
      description: undefined,
      sku: undefined,
      barcode: undefined,
      type: undefined,
      q: undefined,
      page: 1,
      limit: 10,
    });
    expect(result).toEqual({
      items: [
        {
          id: productId.value,
          name: 'Cable',
          description: 'Cable USB',
          baseUnitId,
          sku: '00001',
          customSku: null,
          barcode: null,
          price: 10,
          cost: 5,
          attributes: {},
          type: ProductType.FINISHED,
          isActive: true,
          createdAt: new Date('2026-02-10T10:00:00Z'),
          updatedAt: new Date('2026-02-10T11:00:00Z'),
          baseUnitName: 'Unidad',
          baseUnitCode: 'UND',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  });
});
