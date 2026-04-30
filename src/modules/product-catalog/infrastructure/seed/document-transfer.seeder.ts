import { DataSource, In } from "typeorm";
import { ProductCatalogSkuEntity } from "../../adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "../../adapters/out/persistence/typeorm/entities/stock-item.entity";
import { ProductCatalogInventoryEntity } from "../../adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogInventoryDocumentEntity } from "../../adapters/out/persistence/typeorm/entities/inventory-document.entity";
import { ProductCatalogInventoryDocumentItemEntity } from "../../adapters/out/persistence/typeorm/entities/inventory-document-item.entity";
import { ProductCatalogInventoryLedgerEntity } from "../../adapters/out/persistence/typeorm/entities/inventory-ledger.entity";
import { ProductCatalogDocumentSerieEntity } from "../../adapters/out/persistence/typeorm/entities/document-serie.entity";
import { ProductCatalogProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

import { DocType } from "src/shared/domain/value-objects/doc-type";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { Direction } from "src/shared/domain/value-objects/direction";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";

type WarehouseSeedRef = { id: string };

type SeedInventoryTransfersOptions = {
  totalDocs?: number;
  docsPerType?: number;
  minItemsPerDoc?: number;
  maxItemsPerDoc?: number;
  monthsBack?: number;
  createdBy?: string | null;
  allowNegativeStock?: boolean;
};

/**
 * Genera transferencias de inventario separadas por tipo de producto.
 * Se crean `docsPerType` documentos para SKUs de tipo PRODUCT
 * y `docsPerType` documentos para SKUs de tipo MATERIAL (60 en total con el valor por defecto).
 *
 * La serie TRANSFER de cada warehouse se reutiliza para ambos tipos de documento;
 * el campo `productType` del documento refleja el tipo de SKUs que mueve.
 */
export async function seedInventoryTransfers(
  dataSource: DataSource,
  warehouses: WarehouseSeedRef[],
  options: SeedInventoryTransfersOptions = {},
): Promise<void> {
  const totalDocs = options.totalDocs;
  if (totalDocs !== undefined && totalDocs % 2 !== 0) {
    throw new Error("totalDocs debe ser par para dividirlo entre PRODUCT y MATERIAL");
  }
  const docsPerType = options.docsPerType ?? (totalDocs !== undefined ? totalDocs / 2 : 30);
  const minItemsPerDoc = options.minItemsPerDoc ?? 2;
  const maxItemsPerDoc = options.maxItemsPerDoc ?? 5;
  const monthsBack = options.monthsBack ?? 4;
  const allowNegativeStock = options.allowNegativeStock ?? true;

  if (warehouses.length < 2) {
    throw new Error("Se necesitan al menos 2 warehouses para generar transferencias");
  }

  const skuRepo = dataSource.getRepository(ProductCatalogSkuEntity);
  const stockItemRepo = dataSource.getRepository(ProductCatalogStockItemEntity);
  const inventoryRepo = dataSource.getRepository(ProductCatalogInventoryEntity);
  const documentRepo = dataSource.getRepository(ProductCatalogInventoryDocumentEntity);
  const documentItemRepo = dataSource.getRepository(ProductCatalogInventoryDocumentItemEntity);
  const ledgerRepo = dataSource.getRepository(ProductCatalogInventoryLedgerEntity);
  const serieRepo = dataSource.getRepository(ProductCatalogDocumentSerieEntity);
  const productRepo = dataSource.getRepository(ProductCatalogProductEntity);
  const userRepo = dataSource.getRepository(User);

  let createdBy = options.createdBy ?? null;

  if (!createdBy) {
    const seedUser = await userRepo
      .createQueryBuilder("user")
      .where("user.email = :email", { email: "admin@gmail.com" })
      .getOne();

    if (!seedUser) {
      throw new Error("No se encontró el usuario admin@gmail.com para usar como createdBy");
    }

    createdBy = (seedUser as any).userId ?? (seedUser as any).id ?? null;
  }

  // Cargar todos los SKUs activos con su tipo de producto
  const allSkus = await skuRepo.find({ where: { isActive: true } as any });
  if (!allSkus.length) {
    throw new Error("No hay SKUs activos. Ejecuta primero seedProductCatalog.");
  }

  const productIds = [...new Set(allSkus.map((s) => s.productId))];
  const products = await productRepo.find({ where: { id: In(productIds) } as any });
  const productMap = new Map<string, ProductCatalogProductEntity>(products.map((p) => [p.id, p]));

  // Separar SKUs por tipo de producto
  const productSkus = allSkus.filter((s) => productMap.get(s.productId)?.type === ProductCatalogProductType.PRODUCT);
  const materialSkus = allSkus.filter((s) => productMap.get(s.productId)?.type === ProductCatalogProductType.MATERIAL);

  const stockItems = await stockItemRepo.find({
    where: { skuId: In(allSkus.map((s) => s.id)) } as any,
  });
  const stockItemMap = new Map<string, ProductCatalogStockItemEntity>(stockItems.map((s) => [s.skuId, s]));

  // Buscar una serie TRANSFER por warehouse (compartida para ambos tipos)
  const activeSeries = await serieRepo.find({ where: { isActive: true } as any });
  const transferSeriesByWarehouse = new Map<string, ProductCatalogDocumentSerieEntity>();

  for (const wh of warehouses) {
    const transferSerie = activeSeries.find(
      (s: any) => s.warehouseId === wh.id && s.docType === DocType.TRANSFER,
    );
    if (!transferSerie) {
      throw new Error(`No hay serie activa TRANSFER para warehouse ${wh.id}`);
    }
    transferSeriesByWarehouse.set(wh.id, transferSerie);
  }

  // Cache de inventario
  const inventoryCache = new Map<string, number>();
  const existingInventory = await inventoryRepo.find();
  for (const row of existingInventory) {
    inventoryCache.set(
      buildInventoryKey(row.warehouseId, row.stockItemId, row.locationId),
      Number(row.onHand ?? 0),
    );
  }

  let created = 0;

  // Generar bloques separados: primero los de PRODUCT, luego los de MATERIAL
  const batches: Array<{ skuPool: ProductCatalogSkuEntity[]; productType: ProductCatalogProductType }> = [];

  if (productSkus.length > 0) {
    batches.push({ skuPool: productSkus, productType: ProductCatalogProductType.PRODUCT });
  } else {
    console.warn("seedInventoryTransfers: no hay SKUs de tipo PRODUCT, se omite el bloque PRODUCT.");
  }

  if (materialSkus.length > 0) {
    batches.push({ skuPool: materialSkus, productType: ProductCatalogProductType.MATERIAL });
  } else {
    console.warn("seedInventoryTransfers: no hay SKUs de tipo MATERIAL, se omite el bloque MATERIAL.");
  }

  for (const batch of batches) {
    const { skuPool, productType } = batch;

    // Construir plan de fechas para este bloque
    const plan: Array<{ occurredAt: Date }> = [];
    for (let i = 0; i < docsPerType; i++) {
      plan.push({ occurredAt: randomDateInLastMonths(monthsBack) });
    }
    plan.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    for (let i = 0; i < plan.length; i++) {
      const movement = plan[i];

      // Seleccionar dos warehouses distintos
      const fromWarehouse = randomItem(warehouses);
      let toWarehouse = randomItem(warehouses);
      while (toWarehouse.id === fromWarehouse.id) {
        toWarehouse = randomItem(warehouses);
      }

      const serie = transferSeriesByWarehouse.get(fromWarehouse.id)!;
      const itemCount = randomInt(minItemsPerDoc, Math.min(maxItemsPerDoc, skuPool.length));
      const selectedSkus = takeRandomUnique(skuPool, itemCount);

      if (!selectedSkus.length) continue;

      const serieId = (serie as any).id ?? (serie as any).serieId;
      const nextNumber = Number((serie as any).nextNumber ?? 1);
      const correlative = nextNumber;

      await serieRepo.update(serieId, { nextNumber: nextNumber + 1 } as any);

      const savedDocument = await documentRepo.save({
        docType: DocType.TRANSFER,
        productType,
        status: DocStatus.POSTED,
        serieId,
        correlative,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        referenceId: null,
        referenceType: null,
        note: `Seed transferencia ${productType} #${i + 1}`,
        createdBy,
        postedBy: createdBy,
        postedAt: movement.occurredAt,
        createdAt: movement.occurredAt,
      });

      const documentId = savedDocument.id;
      let insertedItemsCount = 0;

      for (const sku of selectedSkus) {
        const stockItem = stockItemMap.get(sku.id);
        if (!stockItem) continue;

        const stockItemId = stockItem.id;
        const fromKey = buildInventoryKey(fromWarehouse.id, stockItemId, null);
        const toKey = buildInventoryKey(toWarehouse.id, stockItemId, null);

        const currentFromOnHand = inventoryCache.get(fromKey) ?? 0;
        let qty = randomInt(1, 10);

        if (!allowNegativeStock) {
          if (currentFromOnHand <= 0) continue;
          qty = Math.min(qty, currentFromOnHand);
          if (qty <= 0) continue;
        }

        const savedItem = await documentItemRepo.save({
          docId: documentId,
          stockItemId,
          fromLocationId: null,
          toLocationId: null,
          quantity: qty,
          wasteQty: 0,
          unitCost: null,
        });

        const itemId = savedItem.id;
        const nextFromOnHand = currentFromOnHand - qty;
        const currentToOnHand = inventoryCache.get(toKey) ?? 0;
        const nextToOnHand = currentToOnHand + qty;

        inventoryCache.set(fromKey, nextFromOnHand);
        inventoryCache.set(toKey, nextToOnHand);

        // Actualizar balance origen
        const existingFromBalance = await inventoryRepo.findOne({
          where: { warehouseId: fromWarehouse.id, stockItemId, locationId: null },
        });
        if (existingFromBalance) {
          const reserved = Number(existingFromBalance.reserved ?? 0);
          await inventoryRepo.update(
            { warehouseId: fromWarehouse.id, stockItemId },
            { locationId: null, onHand: nextFromOnHand, reserved, available: nextFromOnHand - reserved, updatedAt: movement.occurredAt } as any,
          );
        } else {
          await inventoryRepo.save({
            warehouseId: fromWarehouse.id, stockItemId, locationId: null, onHand: nextFromOnHand, reserved: 0, available: nextFromOnHand, updatedAt: movement.occurredAt,
          });
        }

        // Actualizar balance destino
        const existingToBalance = await inventoryRepo.findOne({
          where: { warehouseId: toWarehouse.id, stockItemId, locationId: null },
        });
        if (existingToBalance) {
          const reserved = Number(existingToBalance.reserved ?? 0);
          await inventoryRepo.update(
            { warehouseId: toWarehouse.id, stockItemId },
            { locationId: null, onHand: nextToOnHand, reserved, available: nextToOnHand - reserved, updatedAt: movement.occurredAt } as any,
          );
        } else {
          await inventoryRepo.save({
            warehouseId: toWarehouse.id, stockItemId, locationId: null, onHand: nextToOnHand, reserved: 0, available: nextToOnHand, updatedAt: movement.occurredAt,
          });
        }

        // Asientos en el ledger
        await ledgerRepo.save({
          docId: documentId, docItemId: itemId, warehouseId: fromWarehouse.id, locationId: null, stockItemId, direction: Direction.OUT, quantity: qty, wasteQty: 0, unitCost: null, createdAt: movement.occurredAt,
        });
        await ledgerRepo.save({
          docId: documentId, docItemId: itemId, warehouseId: toWarehouse.id, locationId: null, stockItemId, direction: Direction.IN, quantity: qty, wasteQty: 0, unitCost: null, createdAt: movement.occurredAt,
        });

        insertedItemsCount++;
      }

      if (insertedItemsCount > 0) created++;
    }

    console.log(`seedInventoryTransfers [${productType}]: bloque finalizado.`);
  }

  console.log(`seedInventoryTransfers finalizado. Documentos creados: ${created} (objetivo: ${batches.length * docsPerType})`);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function takeRandomUnique<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function randomDateInLastMonths(monthsBack: number): Date {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(time);
}

function buildInventoryKey(warehouseId: string, stockItemId: string, locationId: string | null): string {
  return `${warehouseId}::${stockItemId}::${locationId ?? "null"}`;
}
