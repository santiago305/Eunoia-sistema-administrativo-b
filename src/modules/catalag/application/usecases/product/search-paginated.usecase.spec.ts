import { SearchProductsPaginated } from './search-paginated.usecase';

describe('SearchProductsPaginated', () => {
  it('usa paginacion por defecto y mapea resultados', async () => {
    const productRepo = {
      searchPaginated: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'PROD-1',
            name: 'Cable',
            description: 'Cable USB',
            isActive: true,
            createdAt: new Date('2026-02-10T10:00:00Z'),
            updatedAt: new Date('2026-02-10T11:00:00Z'),
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
      page: 1,
      limit: 10,
    });
    expect(result).toEqual({
      items: [
        {
          id: 'PROD-1',
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
