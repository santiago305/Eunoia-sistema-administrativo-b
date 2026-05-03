import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
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
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
import { ProductCatalogInventoryLedgerEntry } from "../../domain/entities/inventory-ledger-entry";
import { INVENTORY_LOCK, InventoryLock } from "../../integration/inventory/ports/inventory-lock.port";
import { INVENTORY_REALTIME, InventoryRealtime, StockUpdatedEvent } from "../../integration/inventory/ports/inventory-realtime.port";

@Injectable()
export class ProcessProductCatalogInventoryDocument {
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

  async execute(input: { docId: string; postedBy: string }) {
    const result = await this.uow.runInTransaction(async (tx) => {
      const document = await this.documentRepo.findById(input.docId, tx);
      if (!document) {
        throw new NotFoundException(errorResponse("Documento no encontrado"));
      }
      if (document.status !== DocStatus.DRAFT) {
        throw new BadRequestException(errorResponse("Solo se pueden procesar documentos en DRAFT"));
      }
      if (![DocType.TRANSFER, DocType.ADJUSTMENT].includes(document.docType)) {
        throw new BadRequestException(errorResponse("Solo se permite procesar TRANSFER y ADJUSTMENT"));
      }

      const items = await this.documentRepo.listItems(document.id!, tx);
      if (!items.length) {
        throw new BadRequestException(errorResponse("El documento no tiene items"));
      }

      const ledgerEntries: ProductCatalogInventoryLedgerEntry[] = [];
      const stockUpdatedEvents: StockUpdatedEvent[] = [];

      if (document.docType === DocType.TRANSFER) {
        if (!document.fromWarehouseId || !document.toWarehouseId) {
          throw new BadRequestException(errorResponse("Documento TRANSFER invalido"));
        }

        for (const item of items) {
          const locationId = item.fromLocationId ?? item.toLocationId ?? null;
          await this.inventoryLock.lockSnapshots(
            [
              {
                warehouseId: document.fromWarehouseId,
                stockItemId: item.stockItemId,
                locationId: locationId ?? undefined,
              },
              {
                warehouseId: document.toWarehouseId,
                stockItemId: item.stockItemId,
                locationId: locationId ?? undefined,
              },
            ]
              .sort((a, b) =>
                `${a.warehouseId}:${a.stockItemId}:${a.locationId ?? ""}`.localeCompare(
                  `${b.warehouseId}:${b.stockItemId}:${b.locationId ?? ""}`,
                ),
              ),
            tx,
          );

          const currentBalances = await this.inventoryRepo.listByStockItemId(item.stockItemId, tx);
          const currentFrom =
            currentBalances.find((row) => row.warehouseId === document.fromWarehouseId && row.locationId === locationId) ??
            new ProductCatalogInventoryBalance(document.fromWarehouseId, item.stockItemId, locationId, 0, 0, 0);

          const availableFrom = currentFrom.available ?? currentFrom.onHand - currentFrom.reserved;
          if (availableFrom < item.quantity) {
            throw new BadRequestException(errorResponse("Stock insuficiente para procesar transferencia"));
          }

          const currentTo =
            currentBalances.find((row) => row.warehouseId === document.toWarehouseId && row.locationId === locationId) ??
            new ProductCatalogInventoryBalance(document.toWarehouseId, item.stockItemId, locationId, 0, 0, 0);

          const fromOnHand = currentFrom.onHand - item.quantity;
          const toOnHand = currentTo.onHand + item.quantity;
          if (fromOnHand < 0) {
            throw new BadRequestException(errorResponse("El inventario no puede quedar en negativo"));
          }

          const fromBalance = await this.inventoryRepo.upsert(
            new ProductCatalogInventoryBalance(
              document.fromWarehouseId,
              item.stockItemId,
              locationId,
              fromOnHand,
              currentFrom.reserved,
              fromOnHand - currentFrom.reserved,
            ),
            tx,
          );

          const toBalance = await this.inventoryRepo.upsert(
            new ProductCatalogInventoryBalance(
              document.toWarehouseId,
              item.stockItemId,
              locationId,
              toOnHand,
              currentTo.reserved,
              toOnHand - currentTo.reserved,
            ),
            tx,
          );
          stockUpdatedEvents.push(
            {
              warehouseId: fromBalance.warehouseId,
              stockItemId: fromBalance.stockItemId,
              locationId: fromBalance.locationId,
              onHand: fromBalance.onHand,
              reserved: fromBalance.reserved,
              available: fromBalance.available ?? fromBalance.onHand - fromBalance.reserved,
              documentId: document.id!,
              occurredAt: new Date().toISOString(),
            },
            {
              warehouseId: toBalance.warehouseId,
              stockItemId: toBalance.stockItemId,
              locationId: toBalance.locationId,
              onHand: toBalance.onHand,
              reserved: toBalance.reserved,
              available: toBalance.available ?? toBalance.onHand - toBalance.reserved,
              documentId: document.id!,
              occurredAt: new Date().toISOString(),
            },
          );

          ledgerEntries.push(
            new ProductCatalogInventoryLedgerEntry(
              undefined,
              document.id!,
              item.id ?? null,
              document.fromWarehouseId,
              item.stockItemId,
              Direction.OUT,
              item.quantity,
              locationId,
              item.wasteQty ?? 0,
              item.unitCost ?? null,
            ),
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
        }
      }

      if (document.docType === DocType.ADJUSTMENT) {
        const warehouseId = document.fromWarehouseId ?? document.toWarehouseId;
        if (!warehouseId) {
          throw new BadRequestException(errorResponse("Documento ADJUSTMENT invalido"));
        }

        for (const item of items) {
          const qty = Number(item.quantity ?? 0);
          if (qty === 0) {
            throw new BadRequestException(errorResponse("Cantidad invalida en item de ajuste"));
          }

          const isOutByLocation = !!item.fromLocationId && !item.toLocationId;
          const isInByLocation = !!item.toLocationId && !item.fromLocationId;
          const direction =
            isOutByLocation
              ? Direction.OUT
              : isInByLocation
                ? Direction.IN
                : qty < 0
                  ? Direction.OUT
                  : Direction.IN;

          const quantity = Math.abs(qty);
          const locationId = (direction === Direction.OUT ? item.fromLocationId : item.toLocationId) ?? null;
          await this.inventoryLock.lockSnapshots(
            [
              {
                warehouseId,
                stockItemId: item.stockItemId,
                locationId: locationId ?? undefined,
              },
            ],
            tx,
          );

          const current =
            await this.inventoryRepo.getSnapshot({ warehouseId, stockItemId: item.stockItemId, locationId }, tx) ??
            new ProductCatalogInventoryBalance(warehouseId, item.stockItemId, locationId, 0, 0, 0);

          if (direction === Direction.OUT) {
            const available = current.available ?? current.onHand - current.reserved;
            if (available < quantity) {
              throw new BadRequestException(errorResponse("Stock insuficiente para procesar ajuste"));
            }
          }

          const nextOnHand = direction === Direction.IN ? current.onHand + quantity : current.onHand - quantity;
          if (nextOnHand < 0) {
            throw new BadRequestException(errorResponse("El inventario no puede quedar en negativo"));
          }

          const updatedBalance = await this.inventoryRepo.upsert(
            new ProductCatalogInventoryBalance(
              warehouseId,
              item.stockItemId,
              locationId,
              nextOnHand,
              current.reserved,
              nextOnHand - current.reserved,
            ),
            tx,
          );
          stockUpdatedEvents.push({
            warehouseId: updatedBalance.warehouseId,
            stockItemId: updatedBalance.stockItemId,
            locationId: updatedBalance.locationId,
            onHand: updatedBalance.onHand,
            reserved: updatedBalance.reserved,
            available: updatedBalance.available ?? updatedBalance.onHand - updatedBalance.reserved,
            documentId: document.id!,
            occurredAt: new Date().toISOString(),
          });

          ledgerEntries.push(
            new ProductCatalogInventoryLedgerEntry(
              undefined,
              document.id!,
              item.id ?? null,
              warehouseId,
              item.stockItemId,
              direction,
              quantity,
              locationId,
              item.wasteQty ?? 0,
              item.unitCost ?? null,
            ),
          );
        }
      }

      if (ledgerEntries.length) {
        await this.ledgerRepo.append(ledgerEntries, tx);
      }
      await this.documentRepo.markPosted({ docId: document.id!, postedBy: input.postedBy, postedAt: new Date() }, tx);

      return {
        response: successResponse("Documento procesado con exito", {
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
