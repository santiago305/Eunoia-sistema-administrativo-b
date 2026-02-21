import { NotFoundException } from '@nestjs/common';
import { UpdateProductVariant } from './update.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('UpdateProductVariant', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const variantUuid = '22222222-2222-4222-8222-222222222222';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('actualiza variante y retorna output', async () => {
    const updated = new ProductVariant(
      variantUuid,
      ProductId.create(productUuid),
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
    );

    const uow = { runInTransaction: jest.fn(async (work) => work({})) };
    const current = new ProductVariant(
      variantUuid,
      ProductId.create(productUuid),
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
    );
    const variantRepo = {
      update: jest.fn().mockResolvedValue(updated),
      findById: jest.fn().mockResolvedValue(current),
    };
    const productRepo = { findById: jest.fn() };

    const useCase = new UpdateProductVariant(uow as any, variantRepo as any, productRepo as any);

    const result = await useCase.execute({
      id: variantUuid,
      sku: 'CAB-00001',
      price: 10,
      cost: 5,
    });

    expect(variantRepo.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: variantUuid,
      productId: productUuid,
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: 10,
      cost: 5,
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });
  });

  it('lanza error si no existe', async () => {
    const uow = { runInTransaction: jest.fn(async (work) => work({})) };
    const variantRepo = {
      update: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
    };
    const productRepo = { findById: jest.fn() };

    const useCase = new UpdateProductVariant(uow as any, variantRepo as any, productRepo as any);

    await expect(useCase.execute({ id: variantUuid })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recalcula sku cuando llegan attributes', async () => {
    const uow = { runInTransaction: jest.fn(async (work) => work({})) };
    const existing = new ProductVariant(
      variantUuid,
      ProductId.create(productUuid),
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
    );
    const updated = new ProductVariant(
      variantUuid,
      ProductId.create(productUuid),
      'CAB-ROJ-M-00001',
      '0001',
      { color: 'Rojo', size: 'M' },
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
    );
    const variantRepo = {
      findById: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(updated),
    };
    const productRepo = {
      findById: jest.fn().mockResolvedValue(
        new Product(ProductId.create(productUuid), 'Cable', 'Cable USB', baseUnitId, true, undefined, new Date(), new Date()),
      ),
    };

    const useCase = new UpdateProductVariant(uow as any, variantRepo as any, productRepo as any);
    const result = await useCase.execute({ id: variantUuid, attributes: { color: 'Rojo', size: 'M' } });

    expect(productRepo.findById).toHaveBeenCalled();
    expect(variantRepo.update).toHaveBeenCalled();
    expect(result.sku).toBe('CAB-ROJ-M-00001');
  });
});
