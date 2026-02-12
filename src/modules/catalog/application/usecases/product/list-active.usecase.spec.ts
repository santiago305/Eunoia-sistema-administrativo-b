import { ListActiveProducts } from './list-active.usecase';

describe('ListActiveProducts', () => {
  it('lista productos activos', async () => {
    const tx = {};

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      listActive: jest.fn().mockResolvedValue([
        {
          id: 'PROD-1',
          name: 'Cable',
          description: 'Cable USB',
          isActive: true,
          createdAt: new Date('2026-02-10T10:00:00Z'),
          updatedAt: new Date('2026-02-10T11:00:00Z'),
        },
      ]),
    };

    const useCase = new ListActiveProducts(uow as any, productRepo as any);

    const result = await useCase.execute();

    expect(productRepo.listActive).toHaveBeenCalledWith(tx);
    expect(result).toEqual([
      {
        id: 'PROD-1',
        name: 'Cable',
        description: 'Cable USB',
        isActive: true,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
    ]);
  });
});
