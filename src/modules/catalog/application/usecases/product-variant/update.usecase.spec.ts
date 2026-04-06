import { NotFoundException } from '@nestjs/common';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';
import { UpdateProductVariant } from './update.usecase';
import { Money } from 'src/shared/value-objets/money.vo';

describe('UpdateProductVariant', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const variantUuid = '22222222-2222-4222-8222-222222222222';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('actualiza variante y retorna output', async () => {
    const updated = ProductVariant.create({
      id: variantUuid,
      productId: ProductId.create(productUuid),
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: Money.create(10),
      cost: Money.create(5),
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });

    const uow = { runInTransaction: jest.fn(async (work) => work({})) };
    const current = ProductVariant.create({
      id: variantUuid,
      productId: ProductId.create(productUuid),
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: Money.create(10),
      cost: Money.create(5),
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });
    const variantRepo = {
      update: jest.fn().mockResolvedValue(updated),
      findById: jest.fn().mockResolvedValue(current),
      findByBarcode: jest.fn().mockResolvedValue(null),
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
      customSku: null,
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
      findByBarcode: jest.fn().mockResolvedValue(null),
    };
    const productRepo = { findById: jest.fn() };

    const useCase = new UpdateProductVariant(uow as any, variantRepo as any, productRepo as any);

    await expect(useCase.execute({ id: variantUuid })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza atributos cuando llegan cambios', async () => {
    const uow = { runInTransaction: jest.fn(async (work) => work({})) };
    const existing = ProductVariant.create({
      id: variantUuid,
      productId: ProductId.create(productUuid),
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: Money.create(10),
      cost: Money.create(5),
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });
    const updated = ProductVariant.create({
      id: variantUuid,
      productId: ProductId.create(productUuid),
      sku: 'CAB-ROJ-M-00001',
      barcode: '0001',
      attributes: { color: 'Rojo', size: 'M' },
      price: Money.create(10),
      cost: Money.create(5),
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });
    const variantRepo = {
      findById: jest.fn().mockResolvedValue(existing),
      findByBarcode: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(updated),
    };
    const productRepo = {
      findById: jest.fn().mockResolvedValue(
        Product.create({
          id: ProductId.create(productUuid),
          name: 'Cable',
          description: 'Cable USB',
          baseUnitId,
          sku: 'CAB-00001',
          price: Money.create(10),
          cost: Money.create(5),
          isActive: true,
          type: ProductType.FINISHED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };

    const useCase = new UpdateProductVariant(uow as any, variantRepo as any, productRepo as any);
    const result = await useCase.execute({ id: variantUuid, attributes: { color: 'Rojo', size: 'M' } });

    expect(variantRepo.update).toHaveBeenCalled();
    expect(result.attributes).toEqual({ color: 'Rojo', size: 'M' });
  });
});
