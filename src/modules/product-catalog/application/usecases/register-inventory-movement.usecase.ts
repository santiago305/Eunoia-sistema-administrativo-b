import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogStockItemNotFoundError } from "../errors/product-catalog-stock-item-not-found.error";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
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

@Injectable()
export class RegisterProductCatalogInventoryMovement {
  constructor(
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY)
    private readonly documentRepo: ProductCatalogInventoryDocumentRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY)
    private readonly ledgerRepo: ProductCatalogInventoryLedgerRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
  ) {}

  async execute(input: {
    docType: DocType;
    stockItemId: string;
    warehouseId: string;
    quantity: number;
    direction: Direction;
    locationId?: string | null;
    unitCost?: number | null;
    note?: string | null;
    createdBy?: string | null;
    referenceId?: string | null;
    referenceType?: ReferenceType | null;
  }) {
    const stockItem = await this.stockItemRepo.findById(input.stockItemId);
    if (!stockItem) throw new NotFoundException(new ProductCatalogStockItemNotFoundError().message);

    const document = await this.documentRepo.create(
      new ProductCatalogInventoryDocument(
        undefined,
        input.docType,
        DocStatus.DRAFT,
        null,
        null,
        input.direction === Direction.OUT ? input.warehouseId : null,
        input.direction === Direction.IN ? input.warehouseId : null,
        input.referenceId ?? null,
        input.referenceType ?? null,
        input.note ?? null,
        input.createdBy ?? null,
        null,
        null,
      ),
    );

    const item = await this.documentRepo.addItem(
      new ProductCatalogInventoryDocumentItem(
        undefined,
        document.id!,
        input.stockItemId,
        input.quantity,
        0,
        input.direction === Direction.OUT ? input.locationId ?? null : null,
        input.direction === Direction.IN ? input.locationId ?? null : null,
        input.unitCost ?? null,
      ),
    );

    const currentBalances = await this.inventoryRepo.listByStockItemId(input.stockItemId);
    const current =
      currentBalances.find((row) => row.warehouseId === input.warehouseId && row.locationId === (input.locationId ?? null)) ??
      new ProductCatalogInventoryBalance(input.warehouseId, input.stockItemId, input.locationId ?? null, 0, 0, 0);

    const nextOnHand =
      input.direction === Direction.IN ? current.onHand + input.quantity : current.onHand - input.quantity;

    const balance = await this.inventoryRepo.upsert(
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        nextOnHand,
        current.reserved,
        nextOnHand - current.reserved,
      ),
    );

    await this.ledgerRepo.append([
      new ProductCatalogInventoryLedgerEntry(
        undefined,
        document.id!,
        item.id!,
        input.warehouseId,
        input.stockItemId,
        input.direction,
        input.quantity,
        input.locationId ?? null,
        0,
        input.unitCost ?? null,
      ),
    ]);

    await this.documentRepo.markPosted({
      docId: document.id!,
      postedBy: input.createdBy ?? null,
      postedAt: new Date(),
    });

    return {
      documentId: document.id!,
      itemId: item.id!,
      balance,
    };
  }
}


