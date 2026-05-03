import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";
import { successResponse } from "src/shared/response-standard/response";
import {
  PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
  ProductCatalogInventoryDocumentRepository,
} from "../../domain/ports/inventory-document.repository";
import {
  PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
  ProductCatalogInventoryLedgerRepository,
} from "../../domain/ports/inventory-ledger.repository";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "../../domain/ports/document-serie.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY, ProductCatalogProductRepository } from "../../domain/ports/product.repository";
import { errorResponse } from "src/shared/response-standard/response";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import { ProductCatalogInventoryDocument } from "../../domain/entities/inventory-document";
import { ProductCatalogInventoryDocumentItem } from "../../domain/entities/inventory-document-item";
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
import { ProductCatalogInventoryLedgerEntry } from "../../domain/entities/inventory-ledger-entry";
import { CreateProductCatalogStockItem } from "./create-stock-item.usecase";
import { INVENTORY_LOCK, InventoryLock } from "../../integration/inventory/ports/inventory-lock.port";
import { INVENTORY_REALTIME, InventoryRealtime, StockUpdatedEvent } from "../../integration/inventory/ports/inventory-realtime.port";

@Injectable()
export class TransferProductCatalogInventoryBetweenWarehouses {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly serieRepo: ProductCatalogDocumentSerieRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(INVENTORY_REALTIME)
    private readonly inventoryRealtime: InventoryRealtime,
    private readonly createStockItem: CreateProductCatalogStockItem,
  ) {}

  async execute(input: {
    fromWarehouseId: string;
    toWarehouseId: string;
    serieId: string;
    locationId?: string | null;
    note?: string | null;
    createdBy?: string | null;
    items: Array<{
      skuId: string;
      quantity: number;
      unitCost?: number | null;
      locationId?: string | null;
    }>;
    autoPost?: boolean;
  }) {
    if (!input.items.length) {
      throw new BadRequestException("Necesita al menos 1 item");
    }
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException("fromWarehouseId y toWarehouseId no pueden ser iguales");
    }

    const result = await this.uow.runInTransaction(async (tx) => {
      const serie = await this.serieRepo.findById(input.serieId, tx);
      if (!serie?.id || !serie.isActive || serie.docType !== DocType.TRANSFER) {
        throw new NotFoundException(errorResponse("Serie no definida"));
      }
      if (serie.warehouseId !== input.fromWarehouseId) {
        throw new BadRequestException(errorResponse("Serie no definida"));
      }

      const resolveProductType = async (productId: string): Promise<ProductCatalogProductType> => {
        const cached = productTypeCache.get(productId);
        if (cached) return cached;
        const product = await this.productRepo.findById(productId);
        if (!product) {
          throw new NotFoundException(errorResponse("Producto no encontrado"));
        }
        productTypeCache.set(productId, product.type);
        return product.type;
      };


      const productTypeCache = new Map<string, ProductCatalogProductType>();

      const firstSku = await this.skuRepo.findById(input.items[0].skuId);
      if (!firstSku) {
        throw new NotFoundException(errorResponse("Sku no encontrado"));
      }
      const documentProductType = await resolveProductType(firstSku.sku.productId);

      const correlative = await this.serieRepo.reserveNextNumber(serie.id, tx);
      const document = await this.documentRepo.create(
        new ProductCatalogInventoryDocument(
          undefined,
          DocType.TRANSFER,
          documentProductType,
          DocStatus.DRAFT,
          serie.id,
          correlative,
          input.fromWarehouseId,
          input.toWarehouseId,
          null,
          null,
          input.note ?? null,
          input.createdBy ?? null,
          null,
          null,
        ),
        tx,
      );

      const ledgerEntries: ProductCatalogInventoryLedgerEntry[] = [];
      const results: Array<{
        skuId: string;
        stockItemId: string;
        documentItemId: string;
        quantity: number;
        unitCost?: number | null;
        fromLocationId: string | null;
        toLocationId: string | null;
        fromBalance?: ProductCatalogInventoryBalance;
        toBalance?: ProductCatalogInventoryBalance;
      }> = [];
      const shouldAutoPost = input.autoPost ?? true;

      for (const row of input.items) {
        if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
          throw new BadRequestException(errorResponse("La cantidad debe ser mayor a 0"));
        }

        const effectiveLocationId = row.locationId ?? input.locationId ?? null;
        const sku = await this.skuRepo.findById(row.skuId);
        if (!sku) {
          throw new NotFoundException(errorResponse("Sku no encontrado"));
        }

        const itemProductType = await resolveProductType(sku.sku.productId);
        if (itemProductType !== documentProductType) {
          throw new BadRequestException(errorResponse("No se permiten transferencias con SKUs de distinto tipo"));
        }

        let stockItem = await this.stockItemRepo.findBySkuId(row.skuId, tx);
        if (!stockItem) {
          stockItem = await this.createStockItem.execute({ skuId: row.skuId, isActive: true }, tx);
        }

        const savedItem = await this.documentRepo.addItem(
          new ProductCatalogInventoryDocumentItem(
            undefined,
            document.id!,
            stockItem.id!,
            row.quantity,
            0,
            effectiveLocationId,
            effectiveLocationId,
            row.unitCost ?? null,
          ),
          tx,
        );

        let fromBalance: ProductCatalogInventoryBalance | undefined;
        let toBalance: ProductCatalogInventoryBalance | undefined;
        if (shouldAutoPost) {
          await this.inventoryLock.lockSnapshots(
            [
              {
                warehouseId: input.fromWarehouseId,
                stockItemId: stockItem.id!,
                locationId: effectiveLocationId ?? undefined,
              },
              {
                warehouseId: input.toWarehouseId,
                stockItemId: stockItem.id!,
                locationId: effectiveLocationId ?? undefined,
              },
            ]
              .sort((a, b) =>
                `${a.warehouseId}:${a.stockItemId}:${a.locationId ?? ""}`.localeCompare(
                  `${b.warehouseId}:${b.stockItemId}:${b.locationId ?? ""}`,
                ),
              ),
            tx,
          );

          const currentBalances = await this.inventoryRepo.listByStockItemId(stockItem.id!, tx);
          const currentFrom =
            currentBalances.find(
              (balance) =>
                balance.warehouseId === input.fromWarehouseId &&
                balance.locationId === effectiveLocationId,
            ) ??
            new ProductCatalogInventoryBalance(
              input.fromWarehouseId,
              stockItem.id!,
              effectiveLocationId,
              0,
              0,
              0,
            );

          const availableFrom = currentFrom.available ?? currentFrom.onHand - currentFrom.reserved;
          if (availableFrom <= 0 || availableFrom < row.quantity) {
            const skuLabel = sku.sku.name || sku.sku.backendSku || row.skuId;
            throw new BadRequestException(
              errorResponse(`Stock de ${skuLabel} no es suficiente para la transferencia`),
            );
          }

          const currentTo =
            currentBalances.find(
              (balance) =>
                balance.warehouseId === input.toWarehouseId &&
                balance.locationId === effectiveLocationId,
            ) ??
            new ProductCatalogInventoryBalance(
              input.toWarehouseId,
              stockItem.id!,
              effectiveLocationId,
              0,
              0,
              0,
            );

          const nextFromOnHand = currentFrom.onHand - row.quantity;
          fromBalance = await this.inventoryRepo.upsert(
            new ProductCatalogInventoryBalance(
              input.fromWarehouseId,
              stockItem.id!,
              effectiveLocationId,
              nextFromOnHand,
              currentFrom.reserved,
              nextFromOnHand - currentFrom.reserved,
            ),
            tx,
          );

          const nextToOnHand = currentTo.onHand + row.quantity;
          toBalance = await this.inventoryRepo.upsert(
            new ProductCatalogInventoryBalance(
              input.toWarehouseId,
              stockItem.id!,
              effectiveLocationId,
              nextToOnHand,
              currentTo.reserved,
              nextToOnHand - currentTo.reserved,
            ),
            tx,
          );

          ledgerEntries.push(
            new ProductCatalogInventoryLedgerEntry(
              undefined,
              document.id!,
              savedItem.id!,
              input.fromWarehouseId,
              stockItem.id!,
              Direction.OUT,
              row.quantity,
              effectiveLocationId,
              0,
              row.unitCost ?? null,
            ),
          );

          ledgerEntries.push(
            new ProductCatalogInventoryLedgerEntry(
              undefined,
              document.id!,
              savedItem.id!,
              input.toWarehouseId,
              stockItem.id!,
              Direction.IN,
              row.quantity,
              effectiveLocationId,
              0,
              row.unitCost ?? null,
            ),
          );
        }

        results.push({
          skuId: row.skuId,
          stockItemId: stockItem.id!,
          documentItemId: savedItem.id!,
          quantity: row.quantity,
          unitCost: row.unitCost ?? null,
          fromLocationId: effectiveLocationId,
          toLocationId: effectiveLocationId,
          fromBalance,
          toBalance,
        });
      }

      if (ledgerEntries.length > 0) {
        await this.ledgerRepo.append(ledgerEntries, tx);
      }
      if (shouldAutoPost) {
        await this.documentRepo.markPosted(
          {
            docId: document.id!,
            postedBy: input.createdBy ?? null,
            postedAt: new Date(),
          },
          tx,
        );
      }
      

      const stockUpdatedEvents: StockUpdatedEvent[] = shouldAutoPost
        ? results.flatMap((row) =>
          [row.fromBalance, row.toBalance]
            .filter((balance): balance is ProductCatalogInventoryBalance => Boolean(balance))
            .map((balance) => ({
              warehouseId: balance.warehouseId,
              stockItemId: balance.stockItemId,
              locationId: balance.locationId,
              onHand: balance.onHand,
              reserved: balance.reserved,
              available: balance.available ?? balance.onHand - balance.reserved,
              documentId: document.id!,
              occurredAt: new Date().toISOString(),
            })),
        )
        : [];

      return {
        response: successResponse(
          shouldAutoPost ? "Transferencia creada con exito" : "Transferencia creada en borrador",
          {
            documentId: document.id!,
            status: shouldAutoPost ? DocStatus.POSTED : DocStatus.DRAFT,
          },
        ),
        stockUpdatedEvents,
      };
    });

    if (result.stockUpdatedEvents.length) {
      this.inventoryRealtime.emitStockUpdated(result.stockUpdatedEvents);
    }

    return result.response;
  }
}
