import { SetProductActive } from './set-active.usecase';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';

describe('SetProductActive', () => {
  it('activa o desactiva un producto', async () => {
    const tx = {};
    const productId = ProductId.create('11111111-1111-4111-8111-111111111111');

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      setActive: jest.fn().mockResolvedValue(undefined),
      setAllVariantsActive: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new SetProductActive(uow as any, productRepo as any);

    const result = await useCase.execute({ id: productId.value, isActive: false });

    expect(productRepo.setActive).toHaveBeenCalledWith(productId, false, tx);
    expect(productRepo.setAllVariantsActive).toHaveBeenCalledWith(productId, false, tx);
    expect(result).toHaveProperty('status');
  });
});

