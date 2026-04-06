import { NotFoundException } from '@nestjs/common';
import { CreateProductVariant } from './create.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

describe('CreateProductVariant', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';
  const baseUnitId = '33333333-3333-4333-8333-333333333333';

  it('lanza error si el producto no existe', async () => {
    const productRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const variantRepo = {
      findByBarcode: jest.fn(),
      findLastSkuByProductId: jest.fn(),
      findLastSkuByPrefix: jest.fn(),
      findLastCreated: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
    };

    const clock = { now: jest.fn().mockReturnValue(new Date('2026-02-10T12:00:00Z')) };

    const uow = { runInTransaction: jest.fn(async (work: any) => work({})) };
    const skuCounterRepo = { reserveNext: jest.fn().mockResolvedValue(1) };
    const createStockItemForVariant = { execute: jest.fn() };
    const useCase = new CreateProductVariant(
      uow as any,
      productRepo as any,
      variantRepo as any,
      skuCounterRepo as any,
      clock as any,
      createStockItemForVariant as any,
    );

    await expect(
      useCase.execute({ productId: productUuid, barcode: '0001', attributes: {}, price: 10, cost: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('crea variante con sku generado', async () => {
    const productId = ProductId.create(productUuid);
    const product = Product.create({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const productRepo = {
      findById: jest.fn().mockResolvedValue(product),
    };

    const variantRepo = {
      findByBarcode: jest.fn().mockResolvedValue(null),
      findBySku: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };

    const now = new Date('2026-02-10T12:00:00Z');
    const clock = { now: jest.fn().mockReturnValue(now) };
    const uow = { runInTransaction: jest.fn(async (work: any) => work({})) };
    const skuCounterRepo = { reserveNext: jest.fn().mockResolvedValue(1) };
    const createStockItemForVariant = { execute: jest.fn().mockResolvedValue({}) };

    const created = ProductVariant.create({
      id: '22222222-2222-4222-8222-222222222222',
      productId,
      sku: '00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: Money.create(10),
      cost: Money.create(5),
      isActive: true,
      createdAt: now,
    });

    (variantRepo.create as jest.Mock).mockResolvedValue(created);

    const useCase = new CreateProductVariant(
      uow as any,
      productRepo as any,
      variantRepo as any,
      skuCounterRepo as any,
      clock as any,
      createStockItemForVariant as any,
    );

    const result = await useCase.execute({
      productId: productUuid,
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: 10,
      cost: 5,
    });

    expect(skuCounterRepo.reserveNext).toHaveBeenCalled();
    expect(variantRepo.create).toHaveBeenCalledWith(expect.any(ProductVariant), {});
    expect(result).toEqual({
      type: 'success',
      message: 'Variante creada con éxito',
      variant: {
        id: '22222222-2222-4222-8222-222222222222',
        productId: productUuid,
        sku: '00001',
        customSku: null,
        barcode: '0001',
        attributes: { color: 'Negro' },
        price: 10,
        cost: 5,
        isActive: true,
        createdAt: now,
      },
    });
  });
});
