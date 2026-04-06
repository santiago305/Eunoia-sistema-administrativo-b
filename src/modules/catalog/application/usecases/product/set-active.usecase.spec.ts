import { SetProductActive } from './set-active.usecase';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

describe('SetProductActive', () => {
  it('activa o desactiva un producto', async () => {
    const tx = {};
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const product = Product.create({
      id: productId,
      name: 'Cable',
      description: 'Cable USB',
      baseUnitId: '33333333-3333-4333-8333-333333333333',
      sku: '00001',
      price: Money.create(10),
      cost: Money.create(5),
      attributes: {},
      isActive: true,
      type: ProductType.FINISHED,
      createdAt: new Date('2026-02-10T10:00:00Z'),
      updatedAt: new Date('2026-02-10T11:00:00Z'),
    });

    const productRepo = {
      findById: jest.fn().mockResolvedValue(product),
      setActive: jest.fn().mockResolvedValue(undefined),
      setAllVariantsActive: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new SetProductActive(uow as any, productRepo as any);

    const result = await useCase.execute({ id: productId.value, isActive: false });

    expect(productRepo.setActive).toHaveBeenCalledWith(productId, false, tx);
    expect(productRepo.setAllVariantsActive).toHaveBeenCalledWith(productId, false, tx);
    expect(result).toEqual({ message: 'Operacion realizada con exito' });
  });
});

