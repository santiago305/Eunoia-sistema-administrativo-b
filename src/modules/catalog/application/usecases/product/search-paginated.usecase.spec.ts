/// <reference types="jest" />
import { SearchProductsPaginated } from './search-paginated.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('SearchProductsPaginated', () => {
  it('usa paginacion por defecto y mapea resultados', async () => {
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const productRepo = {
      searchPaginated: jest.fn().mockResolvedValue({
        items: [
          new Product(
            productId,
            'Cable',
            'Cable USB',
            true,
            new Date('2026-02-10T10:00:00Z'),
            new Date('2026-02-10T11:00:00Z'),
          ),
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
          isActive: true,
          createdAt: new Date('2026-02-10T10:00:00Z'),
          updatedAt: new Date('2026-02-10T11:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  });
});
