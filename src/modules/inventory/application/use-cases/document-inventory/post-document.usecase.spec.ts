import { PostDocumentUseCase } from './post-document.usecase';
import { DocumentRepository } from '../../../domain/ports/document.repository.port';
import { InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { UnitOfWork, TransactionContext } from '../../../domain/ports/unit-of-work.port';
import { InventoryLock } from '../../../domain/ports/inventory-lock.port';
import { ClockPort } from '../../../domain/ports/clock.port';
import { InventoryDocument } from '../../../domain/entities/inventory-document';
import { DocType } from '../../../domain/value-objects/doc-type';
import { DocStatus } from '../../../domain/value-objects/doc-status';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';

describe('PostDocumentUseCase', () => {
  it('postea un documento IN y actualiza ledger e inventario', async () => {
    const documentRepo: DocumentRepository = {
      createDraft: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      listItems: jest.fn(),
      getByIdWithItems: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      markPosted: jest.fn(),
      markCancelled: jest.fn(),
      existsBySerieId: jest.fn(),
    };

    const inventoryRepo: InventoryRepository = {
      getSnapshot: jest.fn(),
      findByKeys: jest.fn(),
      listSnapshots: jest.fn(),
      upsertSnapshot: jest.fn(),
      incrementOnHand: jest.fn(),
      incrementReserved: jest.fn(),
    };

    const ledgerRepo: LedgerRepository = {
      append: jest.fn(),
      list: jest.fn(),
    };

    const uow: UnitOfWork = {
      runInTransaction: async (work) => work({} as TransactionContext),
    };

    const lock: InventoryLock = {
      lockSnapshots: async () => undefined,
    };

    const clock: ClockPort = {
      now: () => new Date('2026-02-06T12:00:00Z'),
    };

    const doc = new InventoryDocument(
      'DOC-1',
      DocType.IN,
      DocStatus.DRAFT,
      'SERIE-1',
      undefined,
      'WH-1',
    );

    const items = [
      new InventoryDocumentItem(
        'ITEM-1',
        'DOC-1',
        'VAR-1',
        10,
        undefined,
        undefined,
        5,
      ),
    ];

    (documentRepo.getByIdWithItems as jest.Mock).mockResolvedValue({ doc, items });
    (inventoryRepo.findByKeys as jest.Mock).mockResolvedValue([]);

    const useCase = new PostDocumentUseCase(
      documentRepo as any,
      inventoryRepo as any,
      ledgerRepo as any,
      uow as any,
      lock as any,
      clock as any,
    );

    const result = await useCase.execute({ docId: 'DOC-1', postedBy: 'USER-1' });

    expect(result).toEqual({ ok: true });
    expect(ledgerRepo.append).toHaveBeenCalledTimes(1);
    expect(inventoryRepo.incrementOnHand).toHaveBeenCalledTimes(1);
    expect(documentRepo.markPosted).toHaveBeenCalledWith(
      {
        docId: 'DOC-1',
        postedBy: 'USER-1',
        postedAt: new Date('2026-02-06T12:00:00Z'),
      },
      expect.any(Object),
    );
  });
});
