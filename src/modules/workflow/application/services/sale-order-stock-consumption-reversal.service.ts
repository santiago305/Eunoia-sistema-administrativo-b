import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { ProductCatalogInventoryDocument } from "src/modules/product-catalog/domain/entities/inventory-document";
import { ProductCatalogInventoryDocumentItem } from "src/modules/product-catalog/domain/entities/inventory-document-item";
import { ProductCatalogInventoryLedgerEntry } from "src/modules/product-catalog/domain/entities/inventory-ledger-entry";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "src/modules/product-catalog/domain/ports/document-serie.repository";
import {
  PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
  ProductCatalogInventoryDocumentRepository,
} from "src/modules/product-catalog/domain/ports/inventory-document.repository";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "src/modules/product-catalog/domain/ports/inventory-ledger.repository";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import {
  INVENTORY_LOCK,
  InventoryLock,
} from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { saleOrderStockConsumptionReversalMarker } from "./sale-order-stock-consumption-reversal-marker";

@Injectable()
export class SaleOrderStockConsumptionReversalService {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly serieRepo: ProductCatalogDocumentSerieRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async restoreAndReserve(
    order: SaleOrder,
    executedBy: string,
    tx: TransactionContext,
  ): Promise<boolean> {
    return this.restoreConsumption(order, executedBy, true, tx);
  }

  async restoreAndRelease(
    order: SaleOrder,
    executedBy: string,
    tx: TransactionContext,
  ): Promise<boolean> {
    return this.restoreConsumption(order, executedBy, false, tx);
  }

  async hasUnreversedConsumption(
    saleOrderId: string,
    tx: TransactionContext,
  ): Promise<boolean> {
    return Boolean(await this.findUnreversedConsumption(saleOrderId, tx));
  }

  private async findUnreversedConsumption(
    saleOrderId: string,
    tx: TransactionContext,
  ): Promise<ProductCatalogInventoryDocument | null> {
    const outDocuments = await this.documentRepo.findByReference(
      {
        referenceType: ReferenceType.SALE_ORDER,
        referenceId: saleOrderId,
        docType: DocType.OUT,
      },
      tx,
    );
    const existingReversals = await this.documentRepo.findByReference(
      {
        referenceType: ReferenceType.SALE_ORDER,
        referenceId: saleOrderId,
        docType: DocType.IN,
      },
      tx,
    );

    return outDocuments.find(
      (document) =>
        document.status === DocStatus.POSTED &&
        document.id &&
        !existingReversals.some(
          (reversal) =>
            reversal.status === DocStatus.POSTED &&
            reversal.note?.includes(
              saleOrderStockConsumptionReversalMarker(document.id as string),
            ),
        ),
    ) ?? null;
  }

  private async restoreConsumption(
    order: SaleOrder,
    executedBy: string,
    keepReserved: boolean,
    tx: TransactionContext,
  ): Promise<boolean> {
    if (!order.warehouseId) {
      throw new BadRequestException(
        "El pedido no tiene almacén para revertir el consumo de stock",
      );
    }

    const consumedDocument = await this.findUnreversedConsumption(order.id, tx);
    if (!consumedDocument?.id) return false;

    const reversalMarker = saleOrderStockConsumptionReversalMarker(
      consumedDocument.id,
    );

    const consumedItems = await this.documentRepo.listItems(
      consumedDocument.id,
      tx,
    );
    if (!consumedItems.length) return false;

    const series = await this.serieRepo.findActiveFor(
      { docType: DocType.IN, warehouseId: order.warehouseId, isActive: true },
      tx,
    );
    if (!series.length) {
      throw new BadRequestException(
        "No hay serie IN activa para restaurar el stock del pedido",
      );
    }

    const keys = consumedItems
      .map((item) => ({
        warehouseId: order.warehouseId as string,
        stockItemId: item.stockItemId,
      }))
      .sort((left, right) =>
        `${left.warehouseId}:${left.stockItemId}`.localeCompare(
          `${right.warehouseId}:${right.stockItemId}`,
        ),
      );
    await this.inventoryLock.lockSnapshots(keys, tx);

    const serie = series[0];
    const correlative = await this.serieRepo.reserveNextNumber(serie.id, tx);
    const now = new Date();
    const note = `${reversalMarker} por corrección del total del pedido ${order.serie ?? "PE"}-${order.correlative ?? order.id}`;
    const reversal = await this.documentRepo.create(
      new ProductCatalogInventoryDocument(
        undefined,
        DocType.IN,
        null,
        DocStatus.DRAFT,
        serie.id,
        correlative,
        null,
        order.warehouseId,
        order.id,
        ReferenceType.SALE_ORDER,
        note,
        executedBy,
        null,
        null,
      ),
      tx,
    );

    const ledgerEntries: ProductCatalogInventoryLedgerEntry[] = [];
    for (const consumedItem of consumedItems) {
      const item = await this.documentRepo.addItem(
        new ProductCatalogInventoryDocumentItem(
          undefined,
          reversal.id as string,
          consumedItem.stockItemId,
          Number(consumedItem.quantity),
          0,
          null,
          null,
          consumedItem.unitCost ?? null,
        ),
        tx,
      );
      const base = {
        warehouseId: order.warehouseId,
        stockItemId: consumedItem.stockItemId,
        locationId: null,
      };
      await this.inventoryRepo.incrementOnHand(
        { ...base, delta: Number(consumedItem.quantity) },
        tx,
      );
      if (keepReserved) {
        await this.inventoryRepo.incrementReserved(
          { ...base, delta: Number(consumedItem.quantity) },
          tx,
        );
      }
      ledgerEntries.push(
        new ProductCatalogInventoryLedgerEntry(
          undefined,
          reversal.id as string,
          item.id ?? null,
          order.warehouseId,
          consumedItem.stockItemId,
          Direction.IN,
          Number(consumedItem.quantity),
          null,
          0,
          consumedItem.unitCost ?? null,
        ),
      );
    }

    await this.ledgerRepo.append(ledgerEntries, tx);
    await this.documentRepo.markPosted(
      { docId: reversal.id as string, postedBy: executedBy, postedAt: now },
      tx,
    );
    await this.saleOrderRepo.setReserveBool(
      { saleOrderId: order.id, reserveBool: keepReserved },
      tx,
    );
    return true;
  }
}
