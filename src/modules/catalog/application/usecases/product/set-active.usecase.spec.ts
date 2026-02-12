import { SetProductActive } from './set-active.usecase';

describe('SetProductActive', () => {
  it('activa o desactiva un producto', async () => {
    const tx = {};

    const uow = {
      runInTransaction: jest.fn(async (work) => work(tx)),
    };

    const productRepo = {
      setActive: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new SetProductActive(uow as any, productRepo as any);

    const result = await useCase.execute({ id: 'PROD-1', isActive: false } as any);

    expect(productRepo.setActive).toHaveBeenCalledWith('PROD-1', false, tx);
    expect(result).toEqual({ ok: true });
  });
});
