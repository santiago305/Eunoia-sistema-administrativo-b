import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/domain/ports/document.repository.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/inventory/domain/ports/document-series.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/inventory/domain/ports/ledger.repository.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/inventory/domain/ports/inventory-lock.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { InventoryDocument } from "src/modules/inventory/domain/entities/inventory-document";
import InventoryDocumentItem from "src/modules/inventory/domain/entities/inventory-document-item";
import { LedgerEntry } from "src/modules/inventory/domain/entities/ledger-entry";
import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { createDraftDocument } from "../../utils/create-draft-document";

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
    const outDoc = await createDraftDocument(
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
      { seriesRepo: this.seriesRepo, documentRepo: this.documentRepo },
      tx,
    );

    for (const c of params.consumption) {
      await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          outDoc.id!,
          c.stockItemId,
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
      stockItemId: c.stockItemId,
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
          c.stockItemId,
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
          stockItemId: c.stockItemId,
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
    const inDoc = await createDraftDocument(
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
      { seriesRepo: this.seriesRepo, documentRepo: this.documentRepo },
      tx,
    );

    for (const item of params.items) {
      await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          inDoc.id!,
          item.finishedItemId,
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
      stockItemId: i.finishedItemId,
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
          item.finishedItemId,
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
          stockItemId: item.finishedItemId,
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


}
