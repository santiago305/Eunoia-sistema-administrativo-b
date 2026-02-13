import { CreateProduct } from './created.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('CreateProduct', () => {
  it('crea un producto y retorna output', async () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const tx = { id: 'tx' };
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      create: jest.fn().mockResolvedValue(
        new Product(productId, 'Cable', 'Cable USB', true, now, now),
      ),
    };

    const clock = { now: jest.fn().mockReturnValue(now) };

    const useCase = new CreateProduct(uow as any, productRepo as any, clock as any);

    const result = await useCase.execute({
      name: 'Cable',
      description: 'Cable USB',
    });

    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
    expect(productRepo.create).toHaveBeenCalledWith(expect.any(Product), tx);
    expect(result).toEqual({
      id: productId.value,
      name: 'Cable',
      description: 'Cable USB',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });
});
