import { BadRequestException } from '@nestjs/common';
import { UpdateProduct } from './update.usecase';

describe('UpdateProduct', () => {
  it('actualiza un producto y retorna output', async () => {
    const tx = {};

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      updated: jest.fn().mockResolvedValue({
        id: 'PROD-1',
        name: 'Cable',
        description: 'Cable USB',
        isActive: true,
        createdAt: new Date('2026-02-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T11:00:00Z'),
      }),
    };

    const useCase = new UpdateProduct(uow as any, productRepo as any);

    const result = await useCase.execute({
      id: 'PROD-1',
      name: 'Cable',
      description: 'Cable USB',
    } as any);

    expect(productRepo.updated).toHaveBeenCalledWith(
      { id: 'PROD-1', name: 'Cable', description: 'Cable USB' },
      tx,
    );
    expect(result).toEqual({
      id: 'PROD-1',
      name: 'Cable',
      description: 'Cable USB',
      isActive: true,
      createdAt: new Date('2026-02-10T10:00:00Z'),
      updatedAt: new Date('2026-02-10T11:00:00Z'),
    });
  });

  it('lanza error si no existe', async () => {
    const uow = {
      runInTransaction: jest.fn(async (work) => work({})),
    };

    const productRepo = {
      updated: jest.fn().mockResolvedValue(null),
    };

    const useCase = new UpdateProduct(uow as any, productRepo as any);

    await expect(
      useCase.execute({ id: 'PROD-1', name: 'X', description: 'Y' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
