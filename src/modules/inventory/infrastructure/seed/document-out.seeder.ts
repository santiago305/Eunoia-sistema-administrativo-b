import { DataSource, In } from 'typeorm';
import { InventoryDocumentEntity } from '../../adapters/out/typeorm/entities/inventory_document.entity';
import { InventoryDocumentItemEntity } from '../../adapters/out/typeorm/entities/inventory_document_item.entity';
import { InventoryLedgerEntity } from '../../adapters/out/typeorm/entities/inventory_ledger.entity';
import { DocumentSerie } from '../../adapters/out/typeorm/entities/document_serie.entity';
import { InventoryEntity } from '../../adapters/out/typeorm/entities/inventory.entity';
import { WarehouseEntity } from 'src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
import { StockItemEntity } from 'src/modules/inventory/adapters/out/typeorm/entities/stock-item.entity';
import { ProductEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product-variant.entity';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { DocStatus } from 'src/modules/inventory/domain/value-objects/doc-status';
import { Direction } from 'src/modules/inventory/domain/value-objects/direction';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';
import { v4 as uuidv4 } from 'uuid';

type SeedDocumentOutOptions = {
  count?: number;
  days?: number;
  itemsPerDoc?: { min: number; max: number };
  batchSize?: number;
  initialOnHand?: number;
};

type SerieTracker = {
  id: string;
  nextNumber: number;
};

const DEFAULT_OPTIONS: Required<SeedDocumentOutOptions> = {
  count: 20000,
  days: 365,
  itemsPerDoc: { min: 1, max: 1 },
  batchSize: 500,
  initialOnHand: 500000,
};

export const seedDocumentOuts = async (
  dataSource: DataSource,
  options: SeedDocumentOutOptions = {},
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const docRepo = dataSource.getRepository(InventoryDocumentEntity);
  const itemRepo = dataSource.getRepository(InventoryDocumentItemEntity);
  const ledgerRepo = dataSource.getRepository(InventoryLedgerEntity);
  const serieRepo = dataSource.getRepository(DocumentSerie);
  const inventoryRepo = dataSource.getRepository(InventoryEntity);
  const warehouseRepo = dataSource.getRepository(WarehouseEntity);
  const stockItemRepo = dataSource.getRepository(StockItemEntity);

  const warehouses = await warehouseRepo.find();
  if (!warehouses.length) {
    throw new Error('No hay almacenes. Ejecuta seedWarehouses primero.');
  }

  const series = await serieRepo.find({ where: { docType: DocType.OUT } });
  const seriesByWarehouse = new Map<string, SerieTracker>();
  for (const s of series) {
    seriesByWarehouse.set(s.warehouseId, { id: s.id, nextNumber: s.nextNumber ?? 1 });
  }

  for (const wh of warehouses) {
    if (!seriesByWarehouse.has(wh.id)) {
      throw new Error(`No hay serie OUT para el almacén ${wh.name}`);
    }
  }

  const finishedStockItems = await stockItemRepo
    .createQueryBuilder('si')
    .leftJoin(ProductEntity, 'p', 'p.product_id = si.product_id')
    .leftJoin(ProductVariantEntity, 'v', 'v.variant_id = si.variant_id')
    .leftJoin(ProductEntity, 'vp', 'vp.product_id = v.product_id')
    .where('(p.type = :type OR vp.type = :type)', { type: ProductType.FINISHED })
    .select('si.id', 'stockItemId')
    .getRawMany<{ stockItemId: string }>();

  if (!finishedStockItems.length) {
    throw new Error('No hay stock items de productos terminados.');
  }

  const warehouseIds = warehouses.map((w) => w.id);
  const stockItemIds = finishedStockItems.map((s) => s.stockItemId);
  const existingInventory = await inventoryRepo.find({
    where: {
      warehouseId: In(warehouseIds),
      stockItemId: In(stockItemIds),
      locationId: null,
    },
  });
  const existingKeys = new Set(
    existingInventory.map((row) => `${row.warehouseId}::${row.stockItemId}`),
  );

  const inventorySeedRows: InventoryEntity[] = [];
  for (const wh of warehouses) {
    for (const si of finishedStockItems) {
      const key = `${wh.id}::${si.stockItemId}`;
      if (existingKeys.has(key)) continue;
      inventorySeedRows.push({
        warehouseId: wh.id,
        stockItemId: si.stockItemId,
        locationId: null,
        onHand: opts.initialOnHand,
        reserved: 0,
        available: opts.initialOnHand,
      } as InventoryEntity);
    }
  }

  if (inventorySeedRows.length) {
    await inventoryRepo.insert(inventorySeedRows);
  }

  const start = new Date();
  start.setDate(start.getDate() - (opts.days - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date();

  const docsBatch: InventoryDocumentEntity[] = [];
  const itemsBatch: InventoryDocumentItemEntity[] = [];
  const ledgerBatch: InventoryLedgerEntity[] = [];
  const inventoryDeltas = new Map<string, number>();

  const pickRandom = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const randomDate = () => {
    const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(t);
  };

  const totalDocs = opts.count;
  for (let i = 0; i < totalDocs; i += 1) {
    const warehouse = pickRandom(warehouses);
    const serie = seriesByWarehouse.get(warehouse.id)!;
    const docId = uuidv4();
    const createdAt = randomDate();

    const correlative = serie.nextNumber;
    serie.nextNumber += 1;

    docsBatch.push({
      id: docId,
      docType: DocType.OUT,
      status: DocStatus.POSTED,
      serieId: serie.id,
      correlative,
      fromWarehouseId: warehouse.id,
      toWarehouseId: null,
      referenceId: null,
      referenceType: null,
      note: 'Venta simulada',
      createdBy: null,
      postedBy: null,
      postedAt: createdAt,
      createdAt,
    } as InventoryDocumentEntity);

    const itemsCount = randomInt(opts.itemsPerDoc.min, opts.itemsPerDoc.max);
    const picked = new Set<string>();

    for (let j = 0; j < itemsCount; j += 1) {
      let chosen = pickRandom(finishedStockItems).stockItemId;
      let tries = 0;
      while (picked.has(chosen) && tries < 5) {
        chosen = pickRandom(finishedStockItems).stockItemId;
        tries += 1;
      }
      picked.add(chosen);

      const itemId = uuidv4();
      const quantity = randomInt(1, 6);

      itemsBatch.push({
        id: itemId,
        docId,
        stockItemId: chosen,
        fromLocationId: null,
        toLocationId: null,
        quantity,
        wasteQty: 0,
        unitCost: null,
      } as InventoryDocumentItemEntity);

      ledgerBatch.push({
        id: uuidv4(),
        docId,
        docItemId: itemId,
        warehouseId: warehouse.id,
        locationId: null,
        stockItemId: chosen,
        direction: Direction.OUT,
        quantity,
        wasteQty: 0,
        unitCost: null,
        createdAt,
      } as InventoryLedgerEntity);

      const invKey = `${warehouse.id}::${chosen}`;
      inventoryDeltas.set(invKey, (inventoryDeltas.get(invKey) ?? 0) - quantity);
    }

    if (docsBatch.length >= opts.batchSize) {
      await docRepo.insert(docsBatch);
      await itemRepo.insert(itemsBatch);
      await ledgerRepo.insert(ledgerBatch);
      for (const [key, delta] of inventoryDeltas) {
        if (!delta) continue;
        const [warehouseId, stockItemId] = key.split('::');
        await inventoryRepo
          .createQueryBuilder()
          .update()
          .set({
            onHand: () => `"on_hand" + (${delta})`,
            available: () => `"available" + (${delta})`,
          })
          .where('warehouse_id = :warehouseId', { warehouseId })
          .andWhere('stock_item_id = :stockItemId', { stockItemId })
          .andWhere('location_id IS NULL')
          .execute();
      }
      docsBatch.length = 0;
      itemsBatch.length = 0;
      ledgerBatch.length = 0;
      inventoryDeltas.clear();
    }
  }

  if (docsBatch.length) {
    await docRepo.insert(docsBatch);
    await itemRepo.insert(itemsBatch);
    await ledgerRepo.insert(ledgerBatch);
    for (const [key, delta] of inventoryDeltas) {
      if (!delta) continue;
      const [warehouseId, stockItemId] = key.split('::');
      await inventoryRepo
        .createQueryBuilder()
        .update()
        .set({
          onHand: () => `"on_hand" + (${delta})`,
          available: () => `"available" + (${delta})`,
        })
        .where('warehouse_id = :warehouseId', { warehouseId })
        .andWhere('stock_item_id = :stockItemId', { stockItemId })
        .andWhere('location_id IS NULL')
        .execute();
    }
  }

  for (const serie of seriesByWarehouse.values()) {
    await serieRepo.update({ id: serie.id }, { nextNumber: serie.nextNumber });
  }
};
