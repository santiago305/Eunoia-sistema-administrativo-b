import { GetLedgerUseCase } from './get-ledger.usecase';
import { LedgerEntry } from '../../../domain/entities/ledger-entry';
import { Direction } from '../../../domain/value-objects/direction';
import { LedgerRepository } from '../../ports/ledger.repository.port';
import { StockItemRepository } from '../../ports/stock-item.repository.port';

describe('GetLedgerUseCase', () => {
  const makeRepo = () =>
    ({
      append: jest.fn(),
      list: jest.fn(),
      getBalances: jest.fn(),
    } as unknown as LedgerRepository);
  const makeStockRepo = () =>
    ({
      findByProductIdOrVariantId: jest.fn(),
    } as unknown as StockItemRepository);

  it('mapea correctamente las entradas del ledger', async () => {
    const repo = makeRepo();
    const stockRepo = makeStockRepo();
    const entries = [
      new LedgerEntry(
        "0",
        'DOC-1',
        'WH-1',
        'VAR-1',
        Direction.IN,
        10,
        5,
        'ITEM-1',
        0,
        'LOC-1',
        new Date('2026-02-06T12:00:00Z'),
      ),
    ];
    (repo.list as jest.Mock).mockResolvedValue({ items: entries, total: 1 });
    (repo.getBalances as jest.Mock).mockResolvedValue({
      entradaRango: 0,
      salidaRango: 0,
      balanceRango: 0,
      balanceInicial: 0,
      balanceFinal: 0,
      balanceTotal: 0,
    });
    (stockRepo.findByProductIdOrVariantId as jest.Mock).mockResolvedValue({ stockItemId: 'VAR-1' });

    const useCase = new GetLedgerUseCase(repo, stockRepo);
    const result = await useCase.execute({ warehouseId: 'WH-1', stockItemId: 'VAR-1' });

    expect(result).toEqual({
      items: [
        {
          id: '0',
          docId: 'DOC-1',
          document: undefined,
          referenceDoc: undefined,
          stockItem: undefined,
          stockItemId: 'VAR-1',
          locationId: 'LOC-1',
          direction: Direction.IN,
          quantity: 10,
          wasteQty: 0,
          unitCost: 5,
          createdAt: new Date('2026-02-06T12:00:00Z'),
          balance: 10,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      balances: {
        entradaRango: 0,
        salidaRango: 0,
        balanceRango: 0,
        balanceInicial: 0,
        balanceFinal: 0,
        balanceTotal: 0,
      },
    });
  });
});

