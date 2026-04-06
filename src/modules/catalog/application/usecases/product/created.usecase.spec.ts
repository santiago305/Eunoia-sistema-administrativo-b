import { CreateProduct } from './created.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

describe('CreateProduct', () => {
  it('crea un producto y retorna output', async () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const tx = { id: 'tx' };
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');
    const baseUnitId = '33333333-3333-4333-8333-333333333333';

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      findByBarcode: jest.fn().mockResolvedValue(null),
      findBySku: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(
        Product.create({
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
          createdAt: now,
          updatedAt: now,
        }),
      ),
    };
    const skuCounterRepo = {
      reserveNext: jest.fn().mockResolvedValue(1),
    };
    const equivalenceRepo = {
      create: jest.fn().mockResolvedValue({}),
    };
    const createStockItemForProduct = {
      execute: jest.fn().mockResolvedValue({}),
    };

    const clock = { now: jest.fn().mockReturnValue(now) };

    const useCase = new CreateProduct(
      uow as any,
      productRepo as any,
      skuCounterRepo as any,
      clock as any,
      equivalenceRepo as any,
      createStockItemForProduct as any,
    );

    const result = await useCase.execute({
      name: 'Cable',
      description: 'Cable USB',
      baseUnitId,
      price: 10,
      cost: 5,
      attributes: {},
      type: ProductType.FINISHED,
    });

    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
    expect(productRepo.create).toHaveBeenCalledWith(expect.any(Product), tx);
    expect(equivalenceRepo.create).toHaveBeenCalledTimes(1);
    expect(createStockItemForProduct.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: productId.value,
      name: 'Cable',
      description: 'Cable USB',
      baseUnitId,
      sku: '00001',
      barcode: null,
      customSku: null,
      price: 10,
      cost: 5,
      attributes: {},
      type: ProductType.FINISHED,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });
});
