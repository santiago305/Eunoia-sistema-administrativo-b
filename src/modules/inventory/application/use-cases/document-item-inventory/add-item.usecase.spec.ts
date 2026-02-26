import { BadRequestException } from '@nestjs/common';
import { AddItemUseCase } from './add-item.usecase';
import { DocumentRepository } from '../../../domain/ports/document.repository.port';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { InventoryDocument } from '../../../domain/entities/inventory-document';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';
import { DocType } from '../../../domain/value-objects/doc-type';
import { DocStatus } from '../../../domain/value-objects/doc-status';

describe('AddItemUseCase', () => {
  const makeRepo = () =>
    ({
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
    } as unknown as DocumentRepository);

  const makeRules = () =>
    ({
      ensureSeriesExists: jest.fn(),
      normalizeQuantity: jest.fn(),
    } as unknown as InventoryRulesService);

  it('lanza error si el documento no existe', async () => {
    const repo = makeRepo();
    const rules = makeRules();
    (repo.findById as jest.Mock).mockResolvedValue(null);

    const useCase = new AddItemUseCase(repo, rules);

    await expect(
      useCase.execute({
        docId: 'DOC-1',
        stockItemId: 'VAR-1',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza error si el documento no esta en DRAFT', async () => {
    const repo = makeRepo();
    const rules = makeRules();
    const doc = new InventoryDocument(
      'DOC-1',
      DocType.IN,
      DocStatus.POSTED,
      'SERIE-1',
      undefined,
      'WH-1',
    );
    (repo.findById as jest.Mock).mockResolvedValue(doc);

    const useCase = new AddItemUseCase(repo, rules);

    await expect(
      useCase.execute({
        docId: 'DOC-1',
        stockItemId: 'VAR-1',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('agrega item normalizando la cantidad', async () => {
    const repo = makeRepo();
    const rules = makeRules();
    const doc = new InventoryDocument(
      'DOC-1',
      DocType.IN,
      DocStatus.DRAFT,
      'SERIE-1',
      undefined,
      'WH-1',
    );
    (repo.findById as jest.Mock).mockResolvedValue(doc);
    (rules.normalizeQuantity as jest.Mock).mockResolvedValue(12);

    const saved = new InventoryDocumentItem(
      'ITEM-1',
      'DOC-1',
      'VAR-1',
      12,
      undefined,
      undefined,
      5,
    );
    (repo.addItem as jest.Mock).mockResolvedValue(saved);

    const useCase = new AddItemUseCase(repo, rules);
    const result = await useCase.execute({
      docId: 'DOC-1',
      stockItemId: 'VAR-1',
      quantity: 1,
      unitCost: 5,
    });

    expect(rules.normalizeQuantity).toHaveBeenCalledWith({
      quantity: 1,
      allowNegative: false,
    });
    expect(repo.addItem).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'ITEM-1',
      docId: 'DOC-1',
      stockItemId: 'VAR-1',
      quantity: 12,
      unitCost: 5,
      fromLocationId: undefined,
      toLocationId: undefined,
    });
  });
});

