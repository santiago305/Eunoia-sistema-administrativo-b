import { ListActiveProducts } from './list-active.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('ListActiveProducts', () => {
  it('lista productos activos', async () => {
    const tx = {};
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      listActive: jest.fn().mockResolvedValue([
        new Product(
          productId,
          'Cable',
          'Cable USB',
          true,
          new Date('2026-02-10T10:00:00Z'),
          new Date('2026-02-10T11:00:00Z'),
        ),
      ]),
    };

    const useCase = new ListActiveProducts(uow as any, productRepo as any);

    const result = await useCase.execute();

    expect(productRepo.listActive).toHaveBeenCalledWith(tx);
    expect(result).toEqual([
      {
        id: productId.value,
        name: 'Cable',
        description: 'Cable USB',
        isActive: true,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      },
    ]);
  });
});
