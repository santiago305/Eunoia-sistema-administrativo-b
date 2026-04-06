import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { InventoryDocument } from "../../../domain/entities/inventory-document";
import InventoryDocumentItem from "../../../domain/entities/inventory-document-item";
import { LedgerEntry } from "../../../domain/entities/ledger-entry";
import { DocumentPostOutValidationService } from "../../../domain/services/document-post-out-validation.service";
import { InventoryRulesService } from "../../../domain/services/inventory-rules.service";
import { DocStatus } from "../../../domain/value-objects/doc-status";
import { Direction } from "../../../domain/value-objects/direction";
import { DocType } from "../../../domain/value-objects/doc-type";
import { CreateAddItemPostTransferInput } from "../../dto/document/input/create-add-item-post-transfer";
import { DocumentSerieNotFoundApplicationError } from "../../errors/document-serie-not-found.error";
import { StockItemNotFoundApplicationError } from "../../errors/stock-item-not-found.error";
import { CLOCK, ClockPort } from "../../ports/clock.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "../../ports/document.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "../../ports/inventory-lock.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "../../ports/inventory.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "../../ports/ledger.repository.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "../../ports/document-series.repository.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "../../ports/stock-item.repository.port";

@Injectable()
export class CreateAddItemPostTransferUseCase {
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

  async execute(input: CreateAddItemPostTransferInput): Promise<{ message: string; docId: string }> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.docType || !input.serieId) {
        throw new BadRequestException("docType y serieId son obligatorios");
      }

      if (input.docType !== DocType.TRANSFER) {
        throw new BadRequestException("El tipo de documento no es el adecuado");
      }

      if (!input.fromWarehouseId || !input.toWarehouseId) {
        throw new BadRequestException("TRANSFER requiere almacen origen y destino");
      }

      if (input.fromWarehouseId === input.toWarehouseId) {
        throw new BadRequestException("TRANSFER requiere almacenes distintos");
      }

      if (!input.items?.length) {
        throw new BadRequestException("El documento no tiene items");
      }

      const serie = await this.seriesRepo.findById(input.serieId, tx);
      if (!serie) {
        throw new NotFoundException(new DocumentSerieNotFoundApplicationError().message);
      }

      if (serie.docType !== input.docType) {
        throw new BadRequestException("docType no coincide con la serie");
      }

      const correlative = await this.seriesRepo.reserveNextNumber(input.serieId, tx);
      const document = new InventoryDocument(
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

      const savedDoc = await this.documentRepo.createDraft(document, tx);
      const addedItems: InventoryDocumentItem[] = [];
      const stockItemCache = new Map<string, string>();

      for (const rawItem of input.items) {
        if (rawItem.quantity === undefined || rawItem.quantity === null) {
          throw new BadRequestException("quantity es obligatorio");
        }

        const itemId = rawItem.itemId ?? rawItem.stockItemId;
        if (!itemId) {
          throw new BadRequestException("itemId o stockItemId es obligatorio");
        }

        let stockItemId = stockItemCache.get(itemId);
        if (!stockItemId) {
          const stockItem =
            (await this.stockItemRepo.findById(itemId, tx)) ??
            (await this.stockItemRepo.findByProductIdOrVariantId(itemId, tx));
          if (!stockItem?.stockItemId) {
            throw new NotFoundException(new StockItemNotFoundApplicationError().message);
          }
          stockItemId = stockItem.stockItemId;
          stockItemCache.set(itemId, stockItemId);
        }

        let normalizedQty: number;
        try {
          normalizedQty = await this.rules.normalizeQuantity({
            quantity: rawItem.quantity,
            allowNegative: false,
          });
        } catch {
          throw new BadRequestException("Cantidad invalida");
        }

        const item = new InventoryDocumentItem(
          undefined,
          savedDoc.id!,
          stockItemId,
          normalizedQty,
          0,
          rawItem.fromLocationId,
          rawItem.toLocationId,
          rawItem.unitCost ?? null,
        );

        addedItems.push(await this.documentRepo.addItem(item, tx));
      }

      await this.lock.lockSnapshots(
        addedItems.flatMap((item) => [
          {
            warehouseId: savedDoc.fromWarehouseId!,
            stockItemId: item.stockItemId,
            locationId: item.fromLocationId,
          },
          {
            warehouseId: savedDoc.toWarehouseId!,
            stockItemId: item.stockItemId,
            locationId: item.toLocationId,
          },
        ]),
        tx,
      );

      const { insuficientes } = await this.outValidator.validateOutStock(
        addedItems,
        savedDoc.fromWarehouseId!,
        tx,
      );

      if (insuficientes.length > 0) {
        throw new BadRequestException({
          message: { insuficientes },
        });
      }

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of addedItems) {
        entries.push(
          new LedgerEntry(
            undefined,
            savedDoc.id!,
            savedDoc.fromWarehouseId!,
            item.stockItemId,
            Direction.OUT,
            item.quantity,
            item.unitCost ?? null,
            item.id,
            item.wasteQty ?? 0,
            item.fromLocationId,
            now,
          ),
        );

        entries.push(
          new LedgerEntry(
            undefined,
            savedDoc.id!,
            savedDoc.toWarehouseId!,
            item.stockItemId,
            Direction.IN,
            item.quantity,
            item.unitCost ?? null,
            item.id,
            item.wasteQty ?? 0,
            item.toLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId: savedDoc.fromWarehouseId!,
            stockItemId: item.stockItemId,
            locationId: item.fromLocationId,
            delta: -item.quantity,
          },
          tx,
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId: savedDoc.toWarehouseId!,
            stockItemId: item.stockItemId,
            locationId: item.toLocationId,
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
        message: "Documento creado y posteado con exito",
        docId: savedDoc.id,
      };
    });
  }
}
