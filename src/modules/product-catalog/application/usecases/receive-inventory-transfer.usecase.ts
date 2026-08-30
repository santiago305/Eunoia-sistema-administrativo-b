import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
import { ProductCatalogInventoryLedgerEntry } from "../../domain/entities/inventory-ledger-entry";
import {
  PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
  ProductCatalogInventoryDocumentRepository,
} from "../../domain/ports/inventory-document.repository";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "../../domain/ports/inventory-ledger.repository";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import { INVENTORY_LOCK, InventoryLock } from "../../integration/inventory/ports/inventory-lock.port";
import {
  INVENTORY_REALTIME,
  InventoryRealtime,
  StockUpdatedEvent,
} from "../../integration/inventory/ports/inventory-realtime.port";

@Injectable()
export class ReceiveProductCatalogInventoryTransfer {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(INVENTORY_REALTIME)
    private readonly inventoryRealtime: InventoryRealtime,
  ) {}

  async execute(input: { docId: string; receivedBy: string }) {
    const result = await this.uow.runInTransaction(async (tx) => {
      const document = await this.documentRepo.findByIdForUpdate(input.docId, tx);
      if (!document) {
        throw new NotFoundException(errorResponse("Transferencia no encontrada"));
      }
      if (document.docType !== DocType.TRANSFER) {
        throw new BadRequestException(errorResponse("El documento no es una transferencia"));
      }
      if (document.status !== DocStatus.IN_TRANSIT) {
        throw new BadRequestException(errorResponse("Solo se pueden recibir transferencias en transito"));
      }
      if (!document.toWarehouseId) {
        throw new BadRequestException(errorResponse("La transferencia no tiene almacen destino"));
      }

      const items = await this.documentRepo.listItems(document.id!, tx);
      if (!items.length) {
        throw new BadRequestException(errorResponse("La transferencia no tiene items"));
      }

      const ledgerEntries: ProductCatalogInventoryLedgerEntry[] = [];
      const stockUpdatedEvents: StockUpdatedEvent[] = [];

      for (const item of items) {
        const locationId = item.toLocationId ?? item.fromLocationId ?? null;
        await this.inventoryLock.lockSnapshots(
          [
            {
              warehouseId: document.toWarehouseId,
              stockItemId: item.stockItemId,
              locationId: locationId ?? undefined,
            },
          ],
          tx,
        );

        const current =
          (await this.inventoryRepo.getSnapshot(
            {
              warehouseId: document.toWarehouseId,
              stockItemId: item.stockItemId,
              locationId,
            },
            tx,
          )) ?? new ProductCatalogInventoryBalance(document.toWarehouseId, item.stockItemId, locationId, 0, 0, 0);

        const nextOnHand = current.onHand + item.quantity;
        const updated = await this.inventoryRepo.upsert(
          new ProductCatalogInventoryBalance(
            document.toWarehouseId,
            item.stockItemId,
            locationId,
            nextOnHand,
            current.reserved,
            nextOnHand - current.reserved,
          ),
          tx,
        );

        ledgerEntries.push(
          new ProductCatalogInventoryLedgerEntry(
            undefined,
            document.id!,
            item.id ?? null,
            document.toWarehouseId,
            item.stockItemId,
            Direction.IN,
            item.quantity,
            locationId,
            item.wasteQty ?? 0,
            item.unitCost ?? null,
          ),
        );

        stockUpdatedEvents.push({
          warehouseId: updated.warehouseId,
          stockItemId: updated.stockItemId,
          locationId: updated.locationId,
          onHand: updated.onHand,
          reserved: updated.reserved,
          available: updated.available ?? updated.onHand - updated.reserved,
          documentId: document.id!,
          docType: document.docType,
          productType: document.productType,
          occurredAt: new Date().toISOString(),
        });
      }

      await this.ledgerRepo.append(ledgerEntries, tx);
      const receivedAt = new Date();
      await this.documentRepo.markReceived(
        { docId: document.id!, receivedBy: input.receivedBy, receivedAt },
        tx,
      );

      return {
        response: successResponse("Transferencia recibida e ingresada al almacen destino", {
          documentId: document.id!,
          status: DocStatus.POSTED,
        }),
        stockUpdatedEvents,
      };
    });

    if (result.stockUpdatedEvents.length) {
      this.inventoryRealtime.emitStockUpdated(result.stockUpdatedEvents);
    }

    return result.response;
  }
}
