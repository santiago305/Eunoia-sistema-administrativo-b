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

type SeedInventoryAdjustmentsOptions = {
  totalDocs?: number;
  docsPerType?: number;
  minItemsPerDoc?: number;
  maxItemsPerDoc?: number;
  monthsBack?: number;
  createdBy?: string | null;
  allowNegativeStock?: boolean;
};

/**
 * Genera ajustes de inventario separados por tipo de producto.
 * Se crean `docsPerType` documentos para SKUs de tipo PRODUCT
 * y `docsPerType` documentos para SKUs de tipo MATERIAL (60 en total con el valor por defecto).
 *
 * La serie ADJUSTMENT de cada warehouse se reutiliza para ambos tipos;
 * el campo `productType` del documento refleja el tipo de SKUs que ajusta.
 */
export async function seedInventoryAdjustments(
  dataSource: DataSource,
  warehouses: WarehouseSeedRef[],
  options: SeedInventoryAdjustmentsOptions = {},
): Promise<void> {
  const totalDocs = options.totalDocs;
  if (totalDocs !== undefined && totalDocs % 2 !== 0) {
    throw new Error("totalDocs debe ser par para dividirlo entre PRODUCT y MATERIAL");
  }
  const docsPerType = options.docsPerType ?? (totalDocs !== undefined ? totalDocs / 2 : 1);
  const minItemsPerDoc = options.minItemsPerDoc ?? 2;
  const maxItemsPerDoc = options.maxItemsPerDoc ?? 5;
  const monthsBack = options.monthsBack ?? 4;
  const allowNegativeStock = options.allowNegativeStock ?? false;

  if (!warehouses.length) {
    throw new Error("No hay warehouses para generar ajustes");
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

  // Cargar todos los SKUs activos
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

  // Buscar una serie ADJUSTMENT por warehouse (compartida para ambos tipos)
  const activeSeries = await serieRepo.find({ where: { isActive: true } as any });
  const adjustmentSeriesByWarehouse = new Map<string, ProductCatalogDocumentSerieEntity>();

  for (const wh of warehouses) {
    const adjSerie = activeSeries.find(
      (s: any) => s.warehouseId === wh.id && s.docType === DocType.ADJUSTMENT,
    );
    if (!adjSerie) {
      throw new Error(`No hay serie activa ADJUSTMENT para warehouse ${wh.id}`);
    }
    adjustmentSeriesByWarehouse.set(wh.id, adjSerie);
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

  // Bloques separados: PRODUCT y MATERIAL
  const batches: Array<{ skuPool: ProductCatalogSkuEntity[]; productType: ProductCatalogProductType }> = [];

  if (productSkus.length > 0) {
    batches.push({ skuPool: productSkus, productType: ProductCatalogProductType.PRODUCT });
  } else {
    console.warn("seedInventoryAdjustments: no hay SKUs de tipo PRODUCT, se omite el bloque PRODUCT.");
  }

  if (materialSkus.length > 0) {
    batches.push({ skuPool: materialSkus, productType: ProductCatalogProductType.MATERIAL });
  } else {
    console.warn("seedInventoryAdjustments: no hay SKUs de tipo MATERIAL, se omite el bloque MATERIAL.");
  }

  for (const batch of batches) {
    const { skuPool, productType } = batch;

    // Construir plan de fechas con dirección aleatoria
    const plan: Array<{ occurredAt: Date; direction: Direction }> = [];
    for (let i = 0; i < docsPerType; i++) {
      plan.push({
        occurredAt: randomDateInLastMonths(monthsBack),
        direction: Math.random() > 0.5 ? Direction.IN : Direction.OUT,
      });
    }
    plan.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    for (let i = 0; i < plan.length; i++) {
      const movement = plan[i];
      const warehouse = randomItem(warehouses);
      const serie = adjustmentSeriesByWarehouse.get(warehouse.id)!;

      const itemCount = randomInt(minItemsPerDoc, Math.min(maxItemsPerDoc, skuPool.length));
      const selectedSkus = takeRandomUnique(skuPool, itemCount);

      if (!selectedSkus.length) continue;

      const serieId = (serie as any).id ?? (serie as any).serieId;
      const nextNumber = Number((serie as any).nextNumber ?? 1);
      const correlative = nextNumber;

      await serieRepo.update(serieId, { nextNumber: nextNumber + 1 } as any);

      const savedDocument = await documentRepo.save({
        docType: DocType.ADJUSTMENT,
        productType,
        status: DocStatus.POSTED,
        serieId,
        correlative,
        fromWarehouseId: warehouse.id,
        toWarehouseId: null,
        referenceId: null,
        referenceType: null,
        note: `Seed ajuste ${productType} #${i + 1}`,
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
        const key = buildInventoryKey(warehouse.id, stockItemId, null);
        const currentOnHand = inventoryCache.get(key) ?? 0;

        let qty = randomInt(1, 10);

        if (movement.direction === Direction.OUT && !allowNegativeStock) {
          if (currentOnHand <= 0) continue;
          qty = Math.min(qty, currentOnHand);
          if (qty <= 0) continue;
        }

        const unitCost = movement.direction === Direction.IN ? randomMoney(5, 120) : null;

        const savedItem = await documentItemRepo.save({
          docId: documentId,
          stockItemId,
          fromLocationId: null,
          toLocationId: null,
          quantity: qty,
          wasteQty: 0,
          unitCost,
        });

        const itemId = savedItem.id;
        const nextOnHand = movement.direction === Direction.IN ? currentOnHand + qty : currentOnHand - qty;

        inventoryCache.set(key, nextOnHand);

        const existingBalance = await inventoryRepo.findOne({
          where: { warehouseId: warehouse.id, stockItemId, locationId: null },
        });

        if (existingBalance) {
          const reserved = Number(existingBalance.reserved ?? 0);
          await inventoryRepo.update(
            { warehouseId: warehouse.id, stockItemId },
            { locationId: null, onHand: nextOnHand, reserved, available: nextOnHand - reserved, updatedAt: movement.occurredAt } as any,
          );
        } else {
          await inventoryRepo.save({
            warehouseId: warehouse.id, stockItemId, locationId: null, onHand: nextOnHand, reserved: 0, available: nextOnHand, updatedAt: movement.occurredAt,
          });
        }

        await ledgerRepo.save({
          docId: documentId,
          docItemId: itemId,
          warehouseId: warehouse.id,
          locationId: null,
          stockItemId,
          direction: movement.direction,
          quantity: qty,
          wasteQty: 0,
          unitCost,
          createdAt: movement.occurredAt,
        });

        insertedItemsCount++;
      }

      if (insertedItemsCount > 0) created++;
    }

    console.log(`seedInventoryAdjustments [${productType}]: bloque finalizado.`);
  }

  console.log(`seedInventoryAdjustments finalizado. Documentos creados: ${created} (objetivo: ${batches.length * docsPerType})`);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMoney(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
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
