import { SetProductVariantActive } from './set-active.usecase';

describe('SetProductVariantActive', () => {
  it('activa o desactiva una variante', async () => {
    const variantRepo = {
      setActive: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new SetProductVariantActive(variantRepo as any);

    const result = await useCase.execute({ id: 'VAR-1', isActive: false } as any);

    expect(variantRepo.setActive).toHaveBeenCalledWith('VAR-1', false);
    expect(result).toEqual({ ok: true });
  });
});
