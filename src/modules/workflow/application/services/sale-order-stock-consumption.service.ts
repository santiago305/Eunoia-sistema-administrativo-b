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
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";

@Injectable()
export class SaleOrderStockConsumptionService {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly serieRepo: ProductCatalogDocumentSerieRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
  ) {}

  async consume(
    order: SaleOrder,
    requirements: Array<{ stockItemId: string; quantity: number }>,
    tx: TransactionContext,
  ): Promise<void> {
    if (!order.warehouseId || !requirements.length) return;

    const existing = await this.documentRepo.findByReference(
      { referenceType: ReferenceType.SALE_ORDER, referenceId: order.id, docType: DocType.OUT },
      tx,
    );
    if (existing.some((document) => document.status === DocStatus.POSTED)) {
      return;
    }

    const series = await this.serieRepo.findActiveFor(
      { docType: DocType.OUT, warehouseId: order.warehouseId, isActive: true },
      tx,
    );
    if (!series.length) {
      throw new BadRequestException("No hay serie OUT activa para el almacen del pedido");
    }
    const serie = series[0];
    const correlative = await this.serieRepo.reserveNextNumber(serie.id, tx);
    const actorId = order.createdBy ?? null;
    const document = await this.documentRepo.create(
      new ProductCatalogInventoryDocument(
        undefined,
        DocType.OUT,
        null,
        DocStatus.DRAFT,
        serie.id,
        correlative,
        order.warehouseId,
        null,
        order.id,
        ReferenceType.SALE_ORDER,
        `Consumo de stock del pedido ${order.serie ?? "PE"}-${order.correlative ?? order.id}`,
        actorId,
        null,
        null,
      ),
      tx,
    );

    const ledgerEntries: ProductCatalogInventoryLedgerEntry[] = [];
    for (const requirement of requirements) {
      const item = await this.documentRepo.addItem(
        new ProductCatalogInventoryDocumentItem(
          undefined,
          document.id!,
          requirement.stockItemId,
          requirement.quantity,
          0,
          null,
          null,
          null,
        ),
        tx,
      );
      const base = {
        warehouseId: order.warehouseId,
        stockItemId: requirement.stockItemId,
        locationId: null,
      };
      await this.inventoryRepo.incrementReserved({ ...base, delta: -requirement.quantity }, tx);
      await this.inventoryRepo.incrementOnHand({ ...base, delta: -requirement.quantity }, tx);
      ledgerEntries.push(
        new ProductCatalogInventoryLedgerEntry(
          undefined,
          document.id!,
          item.id ?? null,
          order.warehouseId,
          requirement.stockItemId,
          Direction.OUT,
          requirement.quantity,
          null,
          0,
          null,
        ),
      );
    }

    await this.ledgerRepo.append(ledgerEntries, tx);
    await this.documentRepo.markPosted(
      { docId: document.id!, postedBy: actorId, postedAt: new Date() },
      tx,
    );
  }
}
