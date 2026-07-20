import { BadRequestException } from '@nestjs/common';
import { RegisterProductCatalogInventoryMovement } from 'src/modules/product-catalog/application/usecases/register-inventory-movement.usecase';
import { TransferProductCatalogInventoryBetweenWarehouses } from 'src/modules/product-catalog/application/usecases/transfer-between-warehouses.usecase';
import { ProductCatalogInventoryBalance } from 'src/modules/product-catalog/domain/entities/inventory-balance';
import { ProductCatalogInventoryDocument } from 'src/modules/product-catalog/domain/entities/inventory-document';
import { ProductCatalogInventoryDocumentItem } from 'src/modules/product-catalog/domain/entities/inventory-document-item';
import { ProductCatalogInventoryLedgerEntry } from 'src/modules/product-catalog/domain/entities/inventory-ledger-entry';
import { ProductCatalogProduct } from 'src/modules/product-catalog/domain/entities/product';
import { ProductCatalogSku } from 'src/modules/product-catalog/domain/entities/sku';
import { ProductCatalogStockItem } from 'src/modules/product-catalog/domain/entities/stock-item';
import { ProductCatalogDocumentSerie } from 'src/modules/product-catalog/domain/entities/document-serie';
import { ProductCatalogProductType } from 'src/modules/product-catalog/domain/value-objects/product-type';
import { Direction } from 'src/shared/domain/value-objects/direction';
import { DocType } from 'src/shared/domain/value-objects/doc-type';

type InventoryFixture = ReturnType<typeof createInventoryFixture>;

function createInventoryFixture(productType: ProductCatalogProductType) {
  const warehouseA = 'warehouse-a';
  const warehouseB = 'warehouse-b';
  const productId = `product-${productType.toLowerCase()}`;
  const skuId = `sku-${productType.toLowerCase()}`;
  const stockItemId = `stock-item-${productType.toLowerCase()}`;
  const balances = new Map<string, ProductCatalogInventoryBalance>();
  const documents: ProductCatalogInventoryDocument[] = [];
  const documentItems: ProductCatalogInventoryDocumentItem[] = [];
  const ledger: ProductCatalogInventoryLedgerEntry[] = [];
  const emittedEvents: unknown[][] = [];
  let documentSequence = 0;
  let documentItemSequence = 0;

  const balanceKey = (warehouseId: string, itemId: string, locationId: string | null = null) =>
    `${warehouseId}:${itemId}:${locationId ?? ''}`;
  const product = new ProductCatalogProduct(productId, `Artículo ${productType}`, null, productType, null, null, true);
  const sku = new ProductCatalogSku(skuId, productId, `SKU-${productType}`, null, `SKU ${productType}`, null, null, 0, 0, false, true, false, true, true);
  const stockItem = new ProductCatalogStockItem(stockItemId, skuId, true);
  const series = [
    ProductCatalogDocumentSerie.create({ id: `in-${productType}`, code: 'IN', name: 'Ingresos', docType: DocType.IN, warehouseId: warehouseA }),
    ProductCatalogDocumentSerie.create({ id: `transfer-${productType}`, code: 'TR', name: 'Transferencias', docType: DocType.TRANSFER, warehouseId: warehouseA }),
    ProductCatalogDocumentSerie.create({ id: `adjustment-${productType}`, code: 'AJ', name: 'Ajustes', docType: DocType.ADJUSTMENT, warehouseId: warehouseA }),
  ];

  const inventoryRepo = {
    getSnapshot: jest.fn(async ({ warehouseId, stockItemId: itemId, locationId = null }) => balances.get(balanceKey(warehouseId, itemId, locationId)) ?? null),
    listByStockItemId: jest.fn(async (itemId: string) => [...balances.values()].filter((balance) => balance.stockItemId === itemId)),
    listBySkuId: jest.fn(async () => []),
    list: jest.fn(async () => [...balances.values()]),
    searchSnapshots: jest.fn(async () => ({ items: [], total: 0 })),
    upsert: jest.fn(async (balance: ProductCatalogInventoryBalance) => {
      balances.set(balanceKey(balance.warehouseId, balance.stockItemId, balance.locationId), balance);
      return balance;
    }),
    incrementOnHand: jest.fn(),
    incrementReserved: jest.fn(),
  };
  const documentRepo = {
    create: jest.fn(async (document: ProductCatalogInventoryDocument) => {
      const saved = new ProductCatalogInventoryDocument(
        `document-${++documentSequence}`,
        document.docType,
        document.productType,
        document.status,
        document.serieId,
        document.correlative,
        document.fromWarehouseId,
        document.toWarehouseId,
        document.referenceId,
        document.referenceType,
        document.note,
        document.createdBy,
        document.postedBy,
        document.postedAt,
        document.createdAt,
      );
      documents.push(saved);
      return saved;
    }),
    findById: jest.fn(), findByReference: jest.fn(), list: jest.fn(), listItems: jest.fn(), updateItem: jest.fn(),
    addItem: jest.fn(async (item: ProductCatalogInventoryDocumentItem) => {
      const saved = new ProductCatalogInventoryDocumentItem(`document-item-${++documentItemSequence}`, item.docId, item.stockItemId, item.quantity, item.wasteQty, item.fromLocationId, item.toLocationId, item.unitCost);
      documentItems.push(saved);
      return saved;
    }),
    markPosted: jest.fn(async ({ docId, postedBy = null, postedAt }) => {
      const index = documents.findIndex((document) => document.id === docId);
      const document = documents[index];
      documents[index] = new ProductCatalogInventoryDocument(
        document.id,
        document.docType,
        document.productType,
        'POSTED' as any,
        document.serieId,
        document.correlative,
        document.fromWarehouseId,
        document.toWarehouseId,
        document.referenceId,
        document.referenceType,
        document.note,
        document.createdBy,
        postedBy,
        postedAt,
        document.createdAt,
      );
    }),
  };
  const ledgerRepo = {
    append: jest.fn(async (entries: ProductCatalogInventoryLedgerEntry[]) => { ledger.push(...entries); }),
    listByStockItemId: jest.fn(async () => []), list: jest.fn(), listMovementsPaged: jest.fn(), updateWasteByDocItem: jest.fn(),
  };
  const stockItemRepo = {
    create: jest.fn(async () => stockItem), findById: jest.fn(), findBySkuId: jest.fn(async () => stockItem), setActive: jest.fn(),
  };
  const skuRepo = { findById: jest.fn(async () => ({ sku, attributes: [] })) };
  const productRepo = { findById: jest.fn(async () => product) };
  const serieRepo = {
    findById: jest.fn(async (id: string) => series.find((serie) => serie.id === id) ?? null),
    findActiveFor: jest.fn(async ({ docType, warehouseId }) => series.filter((serie) => serie.docType === docType && serie.warehouseId === warehouseId)),
    reserveNextNumber: jest.fn(async () => 1), create: jest.fn(), setActive: jest.fn(),
  };
  const uow = { runInTransaction: async (work: (tx: object) => Promise<unknown>) => work({}) };
  const inventoryRealtime = { emitStockUpdated: jest.fn((events: unknown[]) => emittedEvents.push(events)), stream: jest.fn() };
  const inventoryLock = { lockSnapshots: jest.fn(async () => undefined) };
  const createStockItem = { execute: jest.fn(async () => stockItem) };

  return {
    warehouseA, warehouseB, skuId, balances, documents, documentItems, ledger, emittedEvents, inventoryRealtime,
    register: new RegisterProductCatalogInventoryMovement(uow as any, productRepo as any, skuRepo as any, stockItemRepo as any, documentRepo as any, ledgerRepo as any, inventoryRepo as any, serieRepo as any, inventoryLock as any, inventoryRealtime as any, createStockItem as any),
    transfer: new TransferProductCatalogInventoryBetweenWarehouses(uow as any, productRepo as any, skuRepo as any, stockItemRepo as any, inventoryRepo as any, documentRepo as any, ledgerRepo as any, serieRepo as any, inventoryLock as any, inventoryRealtime as any, createStockItem as any),
  };
}

describe('Catalog inventory flow matrix (e2e)', () => {
  it.each([ProductCatalogProductType.PRODUCT, ProductCatalogProductType.MATERIAL])(
    '%s keeps stock, documents, ledger and realtime events consistent',
    async (productType) => {
      const fixture: InventoryFixture = createInventoryFixture(productType);

      await fixture.register.execute({ docType: DocType.IN, warehouseId: fixture.warehouseA, serieId: `in-${productType}`, direction: Direction.IN, items: [{ skuId: fixture.skuId, quantity: 10 }] });
      await expect(fixture.register.execute({ docType: DocType.ADJUSTMENT, warehouseId: fixture.warehouseA, serieId: `adjustment-${productType}`, direction: Direction.OUT, items: [{ skuId: fixture.skuId, quantity: 11 }] })).rejects.toBeInstanceOf(BadRequestException);
      await fixture.transfer.execute({ fromWarehouseId: fixture.warehouseA, toWarehouseId: fixture.warehouseB, serieId: `transfer-${productType}`, items: [{ skuId: fixture.skuId, quantity: 4 }] });
      await fixture.register.execute({ docType: DocType.ADJUSTMENT, warehouseId: fixture.warehouseA, serieId: `adjustment-${productType}`, direction: Direction.OUT, items: [{ skuId: fixture.skuId, quantity: 2 }] });

      const balances = [...fixture.balances.values()].sort((a, b) => a.warehouseId.localeCompare(b.warehouseId));
      expect(balances.map(({ warehouseId, onHand, available }) => ({ warehouseId, onHand, available }))).toEqual([
        { warehouseId: fixture.warehouseA, onHand: 4, available: 4 },
        { warehouseId: fixture.warehouseB, onHand: 4, available: 4 },
      ]);
      expect(balances.reduce((total, balance) => total + balance.onHand, 0)).toBe(8);
      expect(fixture.documents.filter((document) => document.status === 'POSTED').map((document) => document.docType)).toEqual([DocType.IN, DocType.TRANSFER, DocType.ADJUSTMENT]);
      expect(fixture.ledger.map((entry) => ({ direction: entry.direction, quantity: entry.quantity }))).toEqual([
        { direction: Direction.IN, quantity: 10 }, { direction: Direction.OUT, quantity: 4 }, { direction: Direction.IN, quantity: 4 }, { direction: Direction.OUT, quantity: 2 },
      ]);
      expect(fixture.ledger.reduce((total, entry) => total + (entry.direction === Direction.IN ? entry.quantity : -entry.quantity), 0)).toBe(8);
      expect(fixture.emittedEvents.map((events) => events.length)).toEqual([1, 2, 1]);
      expect(fixture.inventoryRealtime.emitStockUpdated).toHaveBeenCalledTimes(3);
    },
  );
});
