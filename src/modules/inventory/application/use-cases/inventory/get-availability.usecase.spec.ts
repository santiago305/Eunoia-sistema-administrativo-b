import { BadRequestException } from '@nestjs/common';
import { GetAvailabilityUseCase } from './get-availability.usecase';
import { InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { Inventory } from '../../../domain/entities/inventory';

describe('GetAvailabilityUseCase', () => {
  const makeRepo = () =>
    ({
      getSnapshot: jest.fn(),
      findByKeys: jest.fn(),
      listSnapshots: jest.fn(),
      upsertSnapshot: jest.fn(),
      incrementOnHand: jest.fn(),
      incrementReserved: jest.fn(),
    } as unknown as InventoryRepository);

  it('lanza error si falta warehouseId o stockItemId', async () => {
    const repo = makeRepo();
    const useCase = new GetAvailabilityUseCase(repo);

    await expect(
      useCase.execute({
        warehouseId: '',
        stockItemId: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('devuelve ceros si no existe snapshot', async () => {
    const repo = makeRepo();
    (repo.getSnapshot as jest.Mock).mockResolvedValue(null);
    const useCase = new GetAvailabilityUseCase(repo);

    const result = await useCase.execute({
      warehouseId: 'WH-1',
      stockItemId: 'VAR-1',
    });

    expect(result).toEqual({
      warehouseId: 'WH-1',
      stockItemId: 'VAR-1',
      locationId: undefined,
      onHand: 0,
      reserved: 0,
      available: 0,
    });
  });

  it('devuelve el snapshot existente', async () => {
    const repo = makeRepo();
    const snapshot = new Inventory('WH-1', 'VAR-1', 10, 2, 8, 'LOC-1', new Date());
    (repo.getSnapshot as jest.Mock).mockResolvedValue(snapshot);
    const useCase = new GetAvailabilityUseCase(repo);

    const result = await useCase.execute({
      warehouseId: 'WH-1',
      stockItemId: 'VAR-1',
      locationId: 'LOC-1',
    });

    expect(result).toEqual({
      warehouseId: 'WH-1',
      stockItemId: 'VAR-1',
      locationId: 'LOC-1',
      onHand: 10,
      reserved: 2,
      available: 8,
    });
  });
});

