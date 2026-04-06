import { NotFoundException } from '@nestjs/common';
import { UpdateProduct } from './update.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

describe('UpdateProduct', () => {
  it('actualiza un producto y retorna output', async () => {
    const tx = {};
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const baseUnitId = '33333333-3333-4333-8333-333333333333';
    const createdAt = new Date('2026-02-10T10:00:00Z');
    const updatedAt = new Date('2026-02-10T11:00:00Z');

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const current = Product.create({
      id: productId,
      name: 'Cable',
      description: 'Cable USB',
      baseUnitId,
      sku: '00001',
      price: Money.create(10),
      cost: Money.create(5),
      attributes: {},
      isActive: true,
      type: ProductType.FINISHED,
      createdAt,
      updatedAt,
    });

    const productRepo = {
      findById: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue(current),
    };

    const useCase = new UpdateProduct(uow as any, productRepo as any);

    const result = await useCase.execute({
      id: productId.value,
      name: 'Cable',
      description: 'Cable USB',
      baseUnitId,
    });

    expect(productRepo.update).toHaveBeenCalledWith(
      { id: productId, name: 'Cable', description: 'Cable USB', baseUnitId },
      tx,
    );
    expect(result).toEqual({
      type: 'success',
      message: 'Producto actualizado con éxito',
      product: {
        id: productId.value,
        name: 'Cable',
        description: 'Cable USB',
        baseUnitId,
        sku: '00001',
        customSku: null,
        barcode: null,
        price: 10,
        cost: 5,
        attributes: {},
        type: ProductType.FINISHED,
        isActive: true,
        createdAt,
        updatedAt,
      },
    });
  });

  it('lanza error si no existe', async () => {
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const uow = {
      runInTransaction: jest.fn(async (work) => work({})),
    };

    const productRepo = {
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };

    const useCase = new UpdateProduct(uow as any, productRepo as any);

    await expect(
      useCase.execute({ id: productId.value, name: 'X', description: 'Y' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
