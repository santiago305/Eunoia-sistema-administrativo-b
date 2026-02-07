import { GetLedgerUseCase } from '../ladger/get-ledger.usecase';
import { LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { LedgerEntry } from '../../../domain/entities/ledger-entry';
import { Direction } from '../../../domain/value-objects/direction';

describe('GetLedgerUseCase', () => {
  const makeRepo = () =>
    ({
      append: jest.fn(),
      list: jest.fn(),
    } as unknown as LedgerRepository);

  it('mapea correctamente las entradas del ledger', async () => {
    const repo = makeRepo();
    const entries = [
      new LedgerEntry(
        1,
        'DOC-1',
        'WH-1',
        'VAR-1',
        Direction.IN,
        10,
        5,
        'LOC-1',
        new Date('2026-02-06T12:00:00Z'),
      ),
    ];
    (repo.list as jest.Mock).mockResolvedValue(entries);

    const useCase = new GetLedgerUseCase(repo);
    const result = await useCase.execute({ warehouseId: 'WH-1' });

    expect(result).toEqual([
      {
        id: 1,
        docId: 'DOC-1',
        warehouseId: 'WH-1',
        locationId: 'LOC-1',
        variantId: 'VAR-1',
        direction: Direction.IN,
        quantity: 10,
        unitCost: 5,
        createdAt: new Date('2026-02-06T12:00:00Z'),
      },
    ]);
  });
});
