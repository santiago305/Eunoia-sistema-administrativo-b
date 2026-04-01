import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';

import { InventoryDocument } from '../../../domain/entities/inventory-document';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';
import { DocStatus } from '../../../domain/value-objects/doc-status';
import { DocType } from '../../../domain/value-objects/doc-type';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { LedgerEntry } from '../../../domain/entities/ledger-entry';
import { Direction } from '../../../domain/value-objects/direction';
import { CreateAddItemPostAdjustmentInput } from '../../dto/document/input/create-add-item-post-adjustment';
import { errorResponse } from 'src/shared/response-standard/response';
import { CLOCK, ClockPort } from '../../ports/clock.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../ports/document-series.repository.port';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';
import { INVENTORY_LOCK, InventoryLock } from '../../ports/inventory-lock.port';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../ports/ledger.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';

@Injectable()
export class CreateAddItemPostAdjustmentUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
    private readonly rules: InventoryRulesService,
  ) {}

  async execute(input: CreateAddItemPostAdjustmentInput): Promise<{
    type: string;
    message: string;
    docId: string;
  }> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.docType || !input.serieId) {
        throw new BadRequestException(errorResponse('docType y serieId son obligatorios'));
      }

      if (input.docType !== DocType.ADJUSTMENT) {
        throw new BadRequestException(errorResponse('El tipo de documento no es el adecuado'));
      }

      if (!input.fromWarehouseId) {
        throw new BadRequestException(errorResponse('ADJUSTMENT requiere un almacen'));
      }
      
      if (!input.items || input.items.length === 0) {
        throw new BadRequestException(errorResponse('El documento no tiene items'));
      }

      const serie = await this.seriesRepo.findById(input.serieId, tx);
      if (!serie) {
        throw new NotFoundException(errorResponse('Serie no encontrada'));
      }

      if (serie.docType !== input.docType) {
        throw new BadRequestException(errorResponse('docType no coincide con la serie'));
      }

      const correlative = await this.seriesRepo.reserveNextNumber(input.serieId, tx);

      const doc = new InventoryDocument(
        undefined,
        input.docType,
        DocStatus.DRAFT,
        input.serieId,
        correlative,
        input.fromWarehouseId,
        undefined,
        input.referenceId,
        input.referenceType,
        input.note,
        input.createdBy,
      );

      const savedDoc = await this.documentRepo.createDraft(doc, tx);

      const addedItems: InventoryDocumentItem[] = [];
      const stockItemCache = new Map<string, string>();

      for (const r of input.items) {
        if (r.quantity === undefined || r.quantity === null) {
          throw new BadRequestException(errorResponse('quantity es obligatorio'));
        }

        const itemId = r.itemId ?? r.stockItemId;
        if (!itemId) {
          throw new BadRequestException(errorResponse('itemId o stockItemId es obligatorio'));
        }

        let stockItemId = stockItemCache.get(itemId);
        if (!stockItemId) {
          const stockItem =
            (await this.stockItemRepo.findById(itemId, tx)) ??
            (await this.stockItemRepo.findByProductIdOrVariantId(itemId, tx));
          if (!stockItem?.stockItemId) {
            throw new NotFoundException(errorResponse('Stock item no encontrado'));
          }
          stockItemId = stockItem.stockItemId;
          stockItemCache.set(itemId, stockItemId);
        }

        const allowNegative = savedDoc.docType === DocType.ADJUSTMENT;
        let normalizedQty: number;
        try {
          normalizedQty = await this.rules.normalizeQuantity({
            quantity: r.quantity,
            allowNegative,
          });
        } catch (error: any) {
          throw new BadRequestException(errorResponse('Cantidad invalida'));
        }

        const item = new InventoryDocumentItem(
          undefined,
          savedDoc.id!,
          stockItemId,
          normalizedQty,
          0,
          r.fromLocationId,
          undefined,
          r.unitCost ?? null,
        );

        const savedItem = await this.documentRepo.addItem(item, tx);
        addedItems.push(savedItem);
      }

      const warehouseId = savedDoc.fromWarehouseId!;
      const keys = addedItems.map((i) => ({
        warehouseId,
        stockItemId: i.stockItemId,
        locationId: i.fromLocationId,
      }));

      await this.lock.lockSnapshots(keys, tx);

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of addedItems) {
        // si es ajuste negativo, validar stock
        if (item.quantity < 0) {
          const snapshot = await this.inventoryRepo.getSnapshot(
            {
              warehouseId,
              stockItemId: item.stockItemId,
              locationId: item.fromLocationId
            },
            tx,
          );

          const onHand = snapshot?.onHand ?? 0;
          const reserved = snapshot?.reserved ?? 0;
          const available = onHand - reserved;

          if (available < Math.abs(item.quantity)) {
            throw new BadRequestException("Stock insuficiente");
          }
        }

        const direction = item.quantity > 0 ? Direction.IN : Direction.OUT;
        const qty = Math.abs(item.quantity);

        entries.push(
          new LedgerEntry(
            undefined,
            savedDoc.id!,
            warehouseId,
            item.stockItemId,
            direction,
            qty,
            item.unitCost ?? null,
            item.id,
            item.wasteQty ?? 0,
            item.fromLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId,
            stockItemId: item.stockItemId,
            locationId: item.fromLocationId,
            delta: item.quantity,
          },
          tx,
        );
      }

      if (entries.length > 0) {
        await this.ledgerRepo.append(entries, tx);
      }

      await this.documentRepo.markPosted(
        { docId: savedDoc.id!, postedBy: input.createdBy, note: input.note, postedAt: now },
        tx,
      );

      return {
        type: 'success',
        message: 'Postedo con exito!',
        docId: savedDoc.id,
      };
    });
  }
}
