import { PackEntity } from 'src/modules/packs/adapters/out/persistence/typeorm/entities/pack.entity';
import { SaleOrderItemEntity } from '../entities/sale-order-item.entity';
import { SaleOrderItemTypeormRepository } from './sale-order-item.typeorm.repo';

describe('SaleOrderItemTypeormRepository', () => {
  it('preserves an explicit historical pack name without reading the current pack', async () => {
    const packFindBy = jest.fn();
    const save = jest.fn().mockImplementation(async (rows) =>
      rows.map((row: Record<string, unknown>) => ({
        ...row,
        id: 'item-1',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
      })),
    );
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === PackEntity ? { findBy: packFindBy } : { save },
      ),
    };
    const repository = new SaleOrderItemTypeormRepository({ manager } as any);

    await repository.bulkCreate([
      {
        saleOrderId: 'order-1',
        referencePackId: 'pack-1',
        packNameSnapshot: 'Nombre historico',
        description: 'Descripcion editada',
        quantity: 1,
        unitPrice: 20,
        total: 20,
      },
    ]);

    expect(packFindBy).not.toHaveBeenCalled();
    expect(manager.getRepository).toHaveBeenCalledWith(SaleOrderItemEntity);
    expect(save).toHaveBeenCalledWith([
      expect.objectContaining({ packNameSnapshot: 'Nombre historico' }),
    ]);
  });
});
