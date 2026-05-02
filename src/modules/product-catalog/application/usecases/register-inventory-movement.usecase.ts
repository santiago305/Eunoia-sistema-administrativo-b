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
      direction?: Direction;
      unitCost?: number | null;
      locationId?: string | null;
    }[];
    warehouseId: string;
    direction?: Direction;
    locationId?: string | null;
    note?: string | null;
    createdBy?: string | null;
    createdAt?: string | null;
    postedAt?: Date | null;
    referenceId?: string | null;
    referenceType?: ReferenceType | null;
    autoPost?: boolean;
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
        direction?: Direction;
        unitCost?: number | null;
        locationId?: string | null;
      }[];
      warehouseId: string;
      direction?: Direction;
      locationId?: string | null;
      note?: string | null;
      createdBy?: string | null;
      createdAt?: string | null;
      postedAt?: Date | null;
      referenceId?: string | null;
      referenceType?: ReferenceType | null;
      autoPost?: boolean;
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
          throw new BadRequestException(errorResponse("Serie no coincide con el tipo de doc"));
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

      const fromWarehouseId =
        input.docType === DocType.OUT || input.docType === DocType.ADJUSTMENT ? input.warehouseId : null;
      const toWarehouseId =
        input.docType === DocType.IN ? input.warehouseId : null;

      const document = await this.documentRepo.create(
        new ProductCatalogInventoryDocument(
          undefined,
          input.docType,
          documentProductType,
          DocStatus.DRAFT,
          serieId,
          correlative,
          fromWarehouseId,
          toWarehouseId,
          input.referenceId ?? null,
          input.referenceType ?? null,
          input.note ?? null,
          input.createdBy ?? null,
          input.createdAt ?? null,
          input.postedAt ?? null,
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
        locationId?: string | null;
        balance?: ProductCatalogInventoryBalance;
      }> = [];
      const shouldAutoPost = input.autoPost ?? true;

      for (const row of input.items) {
        const direction = row.direction ?? input.direction;
        if (!direction) {
          throw new BadRequestException(errorResponse("Direccion requerida"));
        }
        if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
          throw new BadRequestException(errorResponse("La cantidad debe ser mayor a 0"));
        }

        const effectiveLocationId = row.locationId ?? input.locationId ?? null;
        const sku = await this.skuRepo.findById(row.skuId);
        if (!sku) {
          throw new NotFoundException(errorResponse("Sku no encontrado"));
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

        const quantityForItem =
          !shouldAutoPost && input.docType === DocType.ADJUSTMENT
            ? (direction === Direction.OUT ? -Math.abs(row.quantity) : Math.abs(row.quantity))
            : row.quantity;

        const savedItem = await this.documentRepo.addItem(
          new ProductCatalogInventoryDocumentItem(
            undefined,
            document.id!,
            stockItem.id!,
            quantityForItem,
            0,
            direction === Direction.OUT ? effectiveLocationId : null,
            direction === Direction.IN ? effectiveLocationId : null,
            row.unitCost ?? null,
          ),
          tx,
        );

        let balance: ProductCatalogInventoryBalance | undefined;
        if (shouldAutoPost) {
          const currentBalances = await this.inventoryRepo.listByStockItemId(stockItem.id!, tx);
          const current =
            currentBalances.find(
              (snapshot) =>
                snapshot.warehouseId === input.warehouseId &&
                snapshot.locationId === effectiveLocationId,
            ) ??
            new ProductCatalogInventoryBalance(
              input.warehouseId,
              stockItem.id!,
              effectiveLocationId,
              0,
              0,
              0,
            );

          if (direction === Direction.OUT) {
            const available = current.available ?? current.onHand - current.reserved;
            if (available <= 0 || available < row.quantity) {
              const skuLabel = sku.sku.name || sku.sku.backendSku || row.skuId;
              throw new BadRequestException(
                errorResponse(`Stock de ${skuLabel} no es suficiente para el ajuste`),
              );
            }
          }

          const nextOnHand =
            direction === Direction.IN
              ? current.onHand + row.quantity
              : current.onHand - row.quantity;

          if (nextOnHand < 0) {
            throw new BadRequestException(errorResponse("El inventario no puede quedar en negativo"));
          }

          balance = await this.inventoryRepo.upsert(
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
              direction,
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
          unitCost: row.unitCost,
          locationId: effectiveLocationId,
          balance,
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

      return {
        documentId: document.id!,
        status: shouldAutoPost ? DocStatus.POSTED : DocStatus.DRAFT,
        items: results,
      };
  }
}
