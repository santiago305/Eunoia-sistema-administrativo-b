import { ListInactiveProducts } from './list-inactive.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('ListInactiveProducts', () => {
  it('lista productos inactivos', async () => {
    const tx = {};
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const baseUnitId = '33333333-3333-4333-8333-333333333333';

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      listInactive: jest.fn().mockResolvedValue([
        new Product(
          productId,
          'Teclado',
          'Teclado mecanico',
          baseUnitId,
          false,
          undefined,
          new Date('2026-02-10T10:00:00Z'),
          new Date('2026-02-10T11:00:00Z'),
        ),
      ]),
    };

    const useCase = new ListInactiveProducts(uow as any, productRepo as any);

    const result = await useCase.execute();

    expect(productRepo.listInactive).toHaveBeenCalledWith(tx);
    expect(result).toEqual([
      {
        id: productId.value,
        name: 'Teclado',
        description: 'Teclado mecanico',
        baseUnitId,
        isActive: false,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
    ]);
  });
});
