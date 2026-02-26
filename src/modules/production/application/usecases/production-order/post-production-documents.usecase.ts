import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/domain/ports/document.repository.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/inventory/domain/ports/document-series.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/inventory/domain/ports/ledger.repository.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/inventory/domain/ports/inventory-lock.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { InventoryDocument } from "src/modules/inventory/domain/entities/inventory-document";
import InventoryDocumentItem from "src/modules/inventory/domain/entities/inventory-document-item";
import { LedgerEntry } from "src/modules/inventory/domain/entities/ledger-entry";
import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";

@Injectable()
export class PostProductionDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(
    params: {
      order: ProductionOrder;
      items: ProductionOrderItem[];
      consumption: RecipeConsumptionLine[];
      postedBy?: string;
    },
    tx: TransactionContext,
  ): Promise<void> {
    const now = this.clock.now();

    // OUT: consumo de materia prima
    const outDoc = await this.createDraftDocument(
      {
        docType: DocType.OUT,
        serieWarehouseId: params.order.fromWarehouseId,
        fromWarehouseId: params.order.fromWarehouseId,
        toWarehouseId: undefined,
        referenceId: params.order.productionId,
        referenceType: "PRODUCTION_ORDER",
        note: "Consumo de materia prima",
        createdBy: params.postedBy,
      },
      tx,
    );

    for (const c of params.consumption) {
      await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          outDoc.id!,
          c.variantId,
          c.qty,
          c.locationId,
          undefined,
          null,
        ),
        tx,
      );
    }

    const outKeys = params.consumption.map((c) => ({
      warehouseId: params.order.fromWarehouseId,
      stockItemId: c.variantId,
      locationId: c.locationId,
    }));
    await this.lock.lockSnapshots(outKeys, tx);

    const outEntries: LedgerEntry[] = [];
    for (const c of params.consumption) {
      outEntries.push(
        new LedgerEntry(
          undefined,
          outDoc.id!,
          params.order.fromWarehouseId,
          c.variantId,
          Direction.OUT,
          c.qty,
          null,
          c.locationId,
          now,
        ),
      );

      await this.inventoryRepo.incrementOnHand(
        {
          warehouseId: params.order.fromWarehouseId,
          stockItemId: c.variantId,
          locationId: c.locationId,
          delta: -c.qty,
        },
        tx,
      );
    }

    if (outEntries.length > 0) {
      await this.ledgerRepo.append(outEntries, tx);
    }

    await this.documentRepo.markPosted(
      { docId: outDoc.id!, postedBy: params.postedBy, postedAt: now },
      tx,
    );

    // IN: ingreso de producto terminado
    const inDoc = await this.createDraftDocument(
      {
        docType: DocType.IN,
        serieWarehouseId: params.order.toWarehouseId,
        fromWarehouseId: undefined,
        toWarehouseId: params.order.toWarehouseId,
        referenceId: params.order.productionId,
        referenceType: "PRODUCTION_ORDER",
        note: "Ingreso de producto terminado",
        createdBy: params.postedBy,
      },
      tx,
    );

    for (const item of params.items) {
      await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          inDoc.id!,
          item.finishedVariantId,
          item.quantity,
          undefined,
          item.toLocationId ?? undefined,
          item.unitCost ?? null,
        ),
        tx,
      );
    }

    const inKeys = params.items.map((i) => ({
      warehouseId: params.order.toWarehouseId,
      stockItemId: i.finishedVariantId,
      locationId: i.toLocationId,
    }));
    await this.lock.lockSnapshots(inKeys, tx);

    const inEntries: LedgerEntry[] = [];
    for (const item of params.items) {
      inEntries.push(
        new LedgerEntry(
          undefined,
          inDoc.id!,
          params.order.toWarehouseId,
          item.finishedVariantId,
          Direction.IN,
          item.quantity,
          item.unitCost ?? null,
          item.toLocationId ?? undefined,
          now,
        ),
      );

      await this.inventoryRepo.incrementOnHand(
        {
          warehouseId: params.order.toWarehouseId,
          stockItemId: item.finishedVariantId,
          locationId: item.toLocationId ?? undefined,
          delta: item.quantity,
        },
        tx,
      );
    }

    if (inEntries.length > 0) {
      await this.ledgerRepo.append(inEntries, tx);
    }

    await this.documentRepo.markPosted(
      { docId: inDoc.id!, postedBy: params.postedBy, postedAt: now },
      tx,
    );
  }

  private async createDraftDocument(
    params: {
      docType: DocType;
      serieWarehouseId: string;
      fromWarehouseId?: string;
      toWarehouseId?: string;
      referenceId?: string;
      referenceType?: string;
      note?: string;
      createdBy?: string;
    },
    tx: TransactionContext,
  ): Promise<InventoryDocument> {
    const series = await this.seriesRepo.findActiveFor({
      docType: params.docType,
      warehouseId: params.serieWarehouseId,
      isActive: true,
    }, tx);

    if (!series || series.length === 0) {
      throw new NotFoundException(
        {
          type:'error',
          message:'Serie activa no encontrada'
        }
      );
    }

    const serie = series[0];
    const correlative = await this.seriesRepo.reserveNextNumber(serie.id, tx);

    const doc = new InventoryDocument(
      undefined,
      params.docType,
      DocStatus.DRAFT,
      serie.id,
      correlative,
      params.fromWarehouseId,
      params.toWarehouseId,
      params.referenceId,
      params.referenceType,
      params.note,
      params.createdBy,
    );

    return this.documentRepo.createDraft(doc, tx);
  }
}
