import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import InventoryDocumentItem from "src/modules/product-catalog/compat/entities/inventory-document-item";
import { LedgerEntry } from "src/modules/product-catalog/compat/entities/ledger-entry";
import { Direction } from "src/shared/domain/value-objects/direction";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { createDraftDocument } from "../../utils/create-draft-document";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/product-catalog/compat/ports/document-series.repository.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/product-catalog/compat/ports/document.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/product-catalog/compat/ports/inventory-lock.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/product-catalog/compat/ports/inventory.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/product-catalog/compat/ports/ledger.repository.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/product-catalog/compat/ports/stock-item.repository.port";
import { RegisterProductCatalogInventoryMovement } from "src/modules/product-catalog/application/usecases/register-inventory-movement.usecase";
import { ProductionItemResolverService, ResolvedProductionFinishedItem } from "../../services/production-item-resolver.service";

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
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    private readonly productCatalogMovement: RegisterProductCatalogInventoryMovement,
    private readonly itemResolver: ProductionItemResolverService,
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
        referenceType: ReferenceType.PRODUCTION,
        note: "Consumo de materia prima",
        createdBy: params.postedBy,
      },
      { seriesRepo: this.seriesRepo, documentRepo: this.documentRepo },
      tx,
    );

    const outDocItems: InventoryDocumentItem[] = [];
    for (const c of params.consumption) {
      if (c.mode === "sku") {
        await this.productCatalogMovement.execute({
          docType: DocType.OUT,
          stockItemId: c.stockItemId,
          warehouseId: params.order.fromWarehouseId,
          quantity: c.qty,
          direction: Direction.OUT,
          locationId: c.locationId,
          createdBy: params.postedBy ?? null,
          note: "Consumo de materia prima",
          referenceId: params.order.productionId,
          referenceType: ReferenceType.PRODUCTION,
        });
        continue;
      }
      const saved = await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          outDoc.id!,
          c.stockItemId,
          c.qty,
          c.wasteQty ?? 0,
          c.locationId,
          undefined,
          null,
        ),
        tx,
      );
      outDocItems.push(saved);
    }

    const outKeys = outDocItems.map((c) => ({
      warehouseId: params.order.fromWarehouseId,
      stockItemId: c.stockItemId,
      locationId: c.fromLocationId,
    }));
    if (outKeys.length) {
      await this.lock.lockSnapshots(outKeys, tx);
    }

    const outEntries: LedgerEntry[] = [];
    for (const c of outDocItems) {
      outEntries.push(
        new LedgerEntry(
          undefined,
          outDoc.id!,
          params.order.fromWarehouseId,
          c.stockItemId,
          Direction.OUT,
          c.quantity,
          null,
          c.id,
          c.wasteQty ?? 0,
          c.fromLocationId,
          now,
        ),
      );

      await this.inventoryRepo.incrementOnHand(
        {
          warehouseId: params.order.fromWarehouseId,
          stockItemId: c.stockItemId,
          locationId: c.fromLocationId,
          delta: -c.quantity,
        },
        tx,
      );
    }

    if (outEntries.length > 0) {
      await this.ledgerRepo.append(outEntries, tx);
    }

    if (outDocItems.length) {
      await this.documentRepo.markPosted(
        { docId: outDoc.id!, postedBy: params.postedBy, postedAt: now },
        tx,
      );
    }

    // IN: ingreso de producto terminado
    const inDoc = await createDraftDocument(
      {
        docType: DocType.IN,
        serieWarehouseId: params.order.toWarehouseId,
        fromWarehouseId: undefined,
        toWarehouseId: params.order.toWarehouseId,
        referenceId: params.order.productionId,
        referenceType: ReferenceType.PRODUCTION,
        note: "Ingreso de producto terminado",
        createdBy: params.postedBy,
      },
      { seriesRepo: this.seriesRepo, documentRepo: this.documentRepo },
      tx,
    );

    const finishedStockItemCache = new Map<string, ResolvedProductionFinishedItem>();
    const getFinishedStockItemId = async (finishedItemId: string) => {
      const cached = finishedStockItemCache.get(finishedItemId);
      if (cached) return cached;
      const resolved = await this.itemResolver.resolveFinishedItem(finishedItemId, tx);
      if (!resolved.stockItemId) {
        throw new NotFoundException("Stock item de producto terminado no encontrado");
      }
      finishedStockItemCache.set(finishedItemId, resolved);
      return resolved;
    };

    const inDocItems: InventoryDocumentItem[] = [];
    for (const item of params.items) {
      const finishedStockItem = await getFinishedStockItemId(item.finishedItemId);
      if (finishedStockItem.mode === "sku") {
        await this.productCatalogMovement.execute({
          docType: DocType.IN,
          stockItemId: finishedStockItem.stockItemId,
          warehouseId: params.order.toWarehouseId,
          quantity: item.quantity,
          direction: Direction.IN,
          locationId: item.toLocationId ?? undefined,
          unitCost: item.unitCost ?? null,
          createdBy: params.postedBy ?? null,
          note: "Ingreso de producto terminado",
          referenceId: params.order.productionId,
          referenceType: ReferenceType.PRODUCTION,
        });
        continue;
      }
      const saved = await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          inDoc.id!,
          finishedStockItem.stockItemId,
          item.quantity,
          0,
          undefined,
          item.toLocationId ?? undefined,
          item.unitCost ?? null,
        ),
        tx,
      );
      inDocItems.push(saved);
    }

    const inKeys = await Promise.all(
      inDocItems.map(async (i) => ({
        warehouseId: params.order.toWarehouseId,
        stockItemId: i.stockItemId,
        locationId: i.toLocationId,
      })),
    );
    if (inKeys.length) {
      await this.lock.lockSnapshots(inKeys, tx);
    }

    const inEntries: LedgerEntry[] = [];
    for (const item of inDocItems) {
      inEntries.push(
        new LedgerEntry(
          undefined,
          inDoc.id!,
          params.order.toWarehouseId,
          item.stockItemId,
          Direction.IN,
          item.quantity,
          item.unitCost ?? null,
          item.id,
          item.wasteQty ?? 0,
          item.toLocationId ?? undefined,
          now,
        ),
      );

      await this.inventoryRepo.incrementOnHand(
        {
          warehouseId: params.order.toWarehouseId,
          stockItemId: item.stockItemId,
          locationId: item.toLocationId ?? undefined,
          delta: item.quantity,
        },
        tx,
      );
    }

    if (inEntries.length > 0) {
      await this.ledgerRepo.append(inEntries, tx);
    }

    if (inDocItems.length) {
      await this.documentRepo.markPosted(
        { docId: inDoc.id!, postedBy: params.postedBy, postedAt: now },
        tx,
      );
    }
  }


}




