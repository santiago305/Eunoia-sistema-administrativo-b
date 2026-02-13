import { NotFoundException } from '@nestjs/common';
import { UpdateProduct } from './update.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('UpdateProduct', () => {
  it('actualiza un producto y retorna output', async () => {
    const tx = {};
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const createdAt = new Date('2026-02-10T10:00:00Z');
    const updatedAt = new Date('2026-02-10T11:00:00Z');

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      update: jest.fn().mockResolvedValue(
        new Product(productId, 'Cable', 'Cable USB', true, createdAt, updatedAt),
      ),
    };

    const useCase = new UpdateProduct(uow as any, productRepo as any);

    const result = await useCase.execute({
      id: productId.value,
      name: 'Cable',
      description: 'Cable USB',
    });

    expect(productRepo.update).toHaveBeenCalledWith(
      { id: productId, name: 'Cable', description: 'Cable USB' },
      tx,
    );
    expect(result).toEqual({
      id: productId.value,
      name: 'Cable',
      description: 'Cable USB',
      isActive: true,
      createdAt,
      updatedAt,
    });
  });

  it('lanza error si no existe', async () => {
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const uow = {
      runInTransaction: jest.fn(async (work) => work({})),
    };

    const productRepo = {
      update: jest.fn().mockResolvedValue(null),
    };

    const useCase = new UpdateProduct(uow as any, productRepo as any);

    await expect(
      useCase.execute({ id: productId.value, name: 'X', description: 'Y' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
