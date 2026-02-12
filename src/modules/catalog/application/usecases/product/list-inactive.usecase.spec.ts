import { ListInactiveProducts } from './list-inactive.usecase';

describe('ListInactiveProducts', () => {
  it('lista productos inactivos', async () => {
    const tx = {};

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      listInactive: jest.fn().mockResolvedValue([
        {
          id: 'PROD-2',
          name: 'Teclado',
          description: 'Teclado mecanico',
          isActive: false,
          createdAt: new Date('2026-02-10T10:00:00Z'),
          updatedAt: new Date('2026-02-10T11:00:00Z'),
        },
      ]),
    };

    const useCase = new ListInactiveProducts(uow as any, productRepo as any);

    const result = await useCase.execute();

    expect(productRepo.listInactive).toHaveBeenCalledWith(tx);
    expect(result).toEqual([
      {
        id: 'PROD-2',
        name: 'Teclado',
        description: 'Teclado mecanico',
        isActive: false,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
    ]);
  });
});
