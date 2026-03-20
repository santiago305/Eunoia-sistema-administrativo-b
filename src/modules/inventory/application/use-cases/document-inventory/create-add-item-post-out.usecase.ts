import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../../domain/ports/stock-item/stock-item.repository.port';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { CLOCK, ClockPort } from '../../../domain/ports/clock.port';
import { INVENTORY_LOCK, InventoryLock } from '../../../domain/ports/inventory-lock.port';
import { InventoryDocument } from '../../../domain/entities/inventory-document';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';
import { DocStatus } from '../../../domain/value-objects/doc-status';
import { DocType } from '../../../domain/value-objects/doc-type';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { DocumentPostOutValidationService } from '../../../domain/services/document-post-out-validation.service';
import { LedgerEntry } from '../../../domain/entities/ledger-entry';
import { Direction } from '../../../domain/value-objects/direction';
import { CreateAddItemPostOutInput } from '../../dto/document/input/create-add-item-post-out';

@Injectable()
export class CreateAddItemPostOutUseCase {
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
    private readonly outValidator: DocumentPostOutValidationService,
    private readonly rules: InventoryRulesService,
  ) {}

  async execute(input: CreateAddItemPostOutInput): Promise<{type:string,
    message:string, docId:string
  }> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.docType || !input.serieId) {
        throw new BadRequestException('docType y serieId son obligatorios');
      }

      if (input.docType !== DocType.OUT) {
        throw new BadRequestException('El tipo de documento no es el adecuado');
      }

      if (!input.fromWarehouseId) {
        throw new BadRequestException('OUT requiere warehouseId');
      }

      if (!input.items || input.items.length === 0) {
        throw new BadRequestException('El documento no tiene items');
      }

      const serie = await this.seriesRepo.findById(input.serieId, tx);
      if (!serie) {
        throw new NotFoundException('Serie no encontrada');
      }

      if (serie.docType !== input.docType) {
        throw new BadRequestException('docType no coincide con la serie');
      }

      const correlative = await this.seriesRepo.reserveNextNumber(input.serieId, tx);

      const doc = new InventoryDocument(
        undefined,
        input.docType,
        DocStatus.DRAFT,
        input.serieId,
        correlative,
        input.fromWarehouseId,
        input.toWarehouseId,
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
          throw new BadRequestException('quantity es obligatorio');
        }

        const allowNegative = savedDoc.docType === DocType.ADJUSTMENT;
        let normalizedQty: number;
        try {
          normalizedQty = await this.rules.normalizeQuantity({
            quantity: r.quantity,
            allowNegative,
          });
        } catch (error: any) {
          throw new BadRequestException(error?.message ?? 'Cantidad invalida');
        }

        let stockItemId = stockItemCache.get(r.itemId);
        if (!stockItemId) {
          const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(r.itemId, tx);
          if (!stockItem?.stockItemId) {
            throw new NotFoundException('Stock item no encontrado');
          }
          stockItemId = stockItem.stockItemId;
          stockItemCache.set(r.itemId, stockItemId);
        }

        const item = new InventoryDocumentItem(
          undefined,
          savedDoc.id!,
          stockItemId,
          normalizedQty,
          r.fromLocationId,
          r.toLocationId,
          r.unitCost ?? null,
        );

        const savedItem = await this.documentRepo.addItem(item, tx);
        addedItems.push(savedItem);
      }

      const keys = addedItems.map((i) => ({
        warehouseId: savedDoc.fromWarehouseId!,
        stockItemId: i.stockItemId,
        locationId: i.fromLocationId,
      }));

      await this.lock.lockSnapshots(keys, tx);

      const { insuficientes, suficientes } = await this.outValidator.validateOutStock(
        addedItems,
        savedDoc.fromWarehouseId!,
        tx,
      );

      if (insuficientes.length > 0) {
        throw new BadRequestException({
          message: {
            insuficientes,
            suficientes,
          },
        });
      }

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of addedItems) {
        const warehouseId = savedDoc.fromWarehouseId!;

        entries.push(
          new LedgerEntry(
            undefined,
            savedDoc.id!,
            warehouseId,
            item.stockItemId,
            Direction.OUT,
            item.quantity,
            item.unitCost ?? null,
            item.fromLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId,
            stockItemId: item.stockItemId,
            locationId: item.fromLocationId,
            delta: -item.quantity,
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
