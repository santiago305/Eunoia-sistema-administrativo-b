import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogSkuNotFoundError } from "../errors/product-catalog-sku-not-found.error";
import { ProductCatalogStockItemNotFoundError } from "../errors/product-catalog-stock-item-not-found.error";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ProductCatalogInventoryDocumentItem } from "../../domain/entities/inventory-document-item";
import { ProductCatalogInventoryDocument } from "../../domain/entities/inventory-document";
import { ProductCatalogInventoryLedgerEntry } from "../../domain/entities/inventory-ledger-entry";
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
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
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
} from "../../domain/ports/sku.repository";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "../../domain/ports/document-serie.repository";
import { errorResponse } from "src/shared/response-standard/response";
import { CreateProductCatalogStockItem } from "./create-stock-item.usecase";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";

@Injectable()
export class RegisterProductCatalogInventoryMovement {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly serieRepo: ProductCatalogDocumentSerieRepository,
    private readonly createStockItem: CreateProductCatalogStockItem,
  ) {}

  async execute(
    input: {
    docType: DocType;
    serieId?: string | null;
    items: {
      skuId: string;
      quantity: number;
      unitCost?: number | null;
      locationId?: string | null;
    }[];
    warehouseId: string;
    direction: Direction;
    locationId?: string | null;
    note?: string | null;
    createdBy?: string | null;
    referenceId?: string | null;
    referenceType?: ReferenceType | null;
    },
    tx?: TransactionContext,
  ) {
    if (tx) {
      return this.executeInTx(input, tx);
    }
    return this.uow.runInTransaction(async (nextTx) => this.executeInTx(input, nextTx));
  }

  private async executeInTx(
    input: {
      docType: DocType;
      serieId?: string | null;
      items: {
        skuId: string;
        quantity: number;
        unitCost?: number | null;
        locationId?: string | null;
      }[];
      warehouseId: string;
      direction: Direction;
      locationId?: string | null;
      note?: string | null;
      createdBy?: string | null;
      referenceId?: string | null;
      referenceType?: ReferenceType | null;
    },
    tx: TransactionContext,
  ) {
      if (!input.items.length) {
        throw new BadRequestException(errorResponse("Necesita al menos 1 item"));
      }

      const productTypeCache = new Map<string, ProductCatalogProductType>();
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

      const firstSku = await this.skuRepo.findById(input.items[0].skuId);
      if (!firstSku) {
        throw new NotFoundException(errorResponse("Sku no encontrado"));
      }
      const documentProductType = await resolveProductType(firstSku.sku.productId);

      let serieId: string | null = null;
      if (input.serieId) {
        const serie = await this.serieRepo.findById(input.serieId, tx);
        if (!serie?.id || !serie.isActive) {
          throw new NotFoundException(errorResponse("Serie no definida"));
        }
        if (serie.docType !== input.docType) {
          throw new BadRequestException(errorResponse("Serie no definida"));
        }
        serieId = serie.id;
      } else {
        const series = await this.serieRepo.findActiveFor(
          {
            docType: input.docType,
            isActive: true,
            warehouseId: input.warehouseId,
          },
          tx,
        );

        const activeSerie = series[0];
        if (!activeSerie?.id) {
          throw new NotFoundException(errorResponse("Serie no definida"));
        }

        serieId = activeSerie.id;
      }

      const correlative = await this.serieRepo.reserveNextNumber(serieId, tx);

      const document = await this.documentRepo.create(
        new ProductCatalogInventoryDocument(
          undefined,
          input.docType,
          documentProductType,
          DocStatus.DRAFT,
          serieId,
          correlative,
          input.direction === Direction.OUT ? input.warehouseId : null,
          input.direction === Direction.IN ? input.warehouseId : null,
          input.referenceId ?? null,
          input.referenceType ?? null,
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
        locationId: string | null;
        balance: ProductCatalogInventoryBalance;
      }> = [];

      for (const row of input.items) {
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
          stockItem = await this.createStockItem.execute(
            {
              skuId: row.skuId,
              isActive: true,
            },
            tx,
          );
        }

        const savedItem = await this.documentRepo.addItem(
          new ProductCatalogInventoryDocumentItem(
            undefined,
            document.id!,
            stockItem.id!,
            row.quantity,
            0,
            input.direction === Direction.OUT ? effectiveLocationId : null,
            input.direction === Direction.IN ? effectiveLocationId : null,
            row.unitCost ?? null,
          ),
          tx,
        );

        const currentBalances = await this.inventoryRepo.listByStockItemId(stockItem.id!, tx);
        const current =
          currentBalances.find(
            (balance) =>
              balance.warehouseId === input.warehouseId &&
              balance.locationId === effectiveLocationId,
          ) ??
          new ProductCatalogInventoryBalance(
            input.warehouseId,
            stockItem.id!,
            effectiveLocationId,
            0,
            0,
            0,
          );

        const nextOnHand =
          input.direction === Direction.IN
            ? current.onHand + row.quantity
            : current.onHand - row.quantity;

        const balance = await this.inventoryRepo.upsert(
          new ProductCatalogInventoryBalance(
            input.warehouseId,
            stockItem.id!,
            effectiveLocationId,
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
            savedItem.id!,
            input.warehouseId,
            stockItem.id!,
            input.direction,
            row.quantity,
            effectiveLocationId,
            0,
            row.unitCost ?? null,
          ),
        );

        results.push({
          skuId: row.skuId,
          stockItemId: stockItem.id!,
          documentItemId: savedItem.id!,
          quantity: row.quantity,
          unitCost: row.unitCost,
          locationId: effectiveLocationId,
          balance,
        });
      }

      await this.ledgerRepo.append(ledgerEntries, tx);

      await this.documentRepo.markPosted(
        {
          docId: document.id!,
          postedBy: input.createdBy ?? null,
          postedAt: new Date(),
        },
        tx,
      );

      return {
        tranId: document.id!,
        items: results,
      };
  }
}
