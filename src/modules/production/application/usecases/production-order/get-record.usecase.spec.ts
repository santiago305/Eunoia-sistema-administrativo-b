import { GetProductionOrder } from './get-record.usecase';
import { ProductionOrder } from 'src/modules/production/domain/entity/production-order.entity';
import { ProductionStatus } from 'src/modules/production/domain/value-objects/production-status.vo';
import { ProductionDocType } from 'src/modules/production/domain/value-objects/doc-type.vo';

describe('GetProductionOrder', () => {
  it('derives imageProdution from production attachments before legacy values', async () => {
    const order = new ProductionOrder(
      'production-1',
      'warehouse-from',
      'warehouse-to',
      ProductionDocType.PRODUCTION,
      'serie-1',
      1,
      ProductionStatus.IN_PROGRESS,
      new Date('2026-07-15T00:00:00.000Z'),
      'user-1',
      new Date('2026-07-15T00:00:00.000Z'),
      null,
      null,
      null,
      ['/api/assets/production/legacy.webp'],
    );
    const uow = {
      runInTransaction: jest.fn((callback) => callback({})),
    };
    const orderRepo = {
      getByIdWithItems: jest.fn().mockResolvedValue({
        order,
        items: [],
        serie: null,
      }),
    };
    const productionAttachmentRepository = {
      find: jest.fn().mockResolvedValue([
        {
          url: '/api/assets/production-attachments/production-1/new.webp',
        },
      ]),
    };

    const usecase = new GetProductionOrder(
      uow as any,
      orderRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      productionAttachmentRepository as any,
    );

    const result = await usecase.execute({ productionId: 'production-1' });

    expect(result.imageProdution).toEqual([
      '/api/assets/production-attachments/production-1/new.webp',
      '/api/assets/production/legacy.webp',
    ]);
  });
});

