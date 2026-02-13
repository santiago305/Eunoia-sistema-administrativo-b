import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { SetProductVariantActive } from './set-active.usecase';

describe('SetProductVariantActive', () => {
  it('activa o desactiva una variante', async () => {
    const variantRepo = {
      findById: jest.fn().mockResolvedValue(
        new ProductVariant(
          '22222222-2222-4222-8222-222222222222',
          ProductId.create('11111111-1111-4111-8111-111111111111'),
          'CAB-00001',
          '0001',
          { color: 'Negro' },
          Money.create(10),
          Money.create(5),
          true,
          new Date('2026-02-10T12:00:00Z'),
        ),
      ),
      setActive: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new SetProductVariantActive(variantRepo as any);

    const result = await useCase.execute({ id: 'VAR-1', isActive: false } as any);

    expect(variantRepo.findById).toHaveBeenCalledWith('VAR-1');
    expect(variantRepo.setActive).toHaveBeenCalledWith('VAR-1', false);
    expect(result).toEqual({ ok: true });
  });
});
