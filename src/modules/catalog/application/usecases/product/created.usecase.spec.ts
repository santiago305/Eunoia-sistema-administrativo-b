import { CreateProduct } from './created.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';

describe('CreateProduct', () => {
  it('crea un producto y retorna output', async () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const tx = { id: 'tx' };

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      created: jest.fn().mockResolvedValue({
        id: 'PROD-1',
        name: 'Cable',
        description: 'Cable USB',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    };

    const clock = { now: jest.fn().mockReturnValue(now) };

    const useCase = new CreateProduct(uow as any, productRepo as any, clock as any);

    const result = await useCase.execute({
      name: 'Cable',
      description: 'Cable USB',
    } as any);

    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
    expect(productRepo.created).toHaveBeenCalledWith(expect.any(Product), tx);
    expect(result).toEqual({
      id: 'PROD-1',
      name: 'Cable',
      description: 'Cable USB',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });
});

