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

type WarehouseSeedRef = { id: string };

type SeedInventoryDocumentsOptions = {
  totalDocs?: number;
  minItemsPerDoc?: number;
  maxItemsPerDoc?: number;
  monthsBack?: number;
  createdBy?: string | null;
  allowNegativeStock?: boolean;
};

export async function seedInventoryDocuments(
  dataSource: DataSource,
  warehouses: WarehouseSeedRef[],
  options: SeedInventoryDocumentsOptions = {},
): Promise<void> {
  const totalDocs = options.totalDocs ?? 3000;
  const minItemsPerDoc = options.minItemsPerDoc ?? 5;
  const maxItemsPerDoc = options.maxItemsPerDoc ?? 8;
  const monthsBack = options.monthsBack ?? 4;
  const allowNegativeStock = options.allowNegativeStock ?? true;

  if (!warehouses.length) {
    throw new Error("No hay warehouses para generar documentos");
  }

  if (totalDocs % 2 !== 0) {
    throw new Error("totalDocs debe ser par para dividirlo entre IN y OUT");
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

    if (!createdBy) {
      throw new Error("No se pudo resolver el id del usuario admin@gmail.com");
    }
  }

  const skus = await skuRepo.find({
    where: { isActive: true } as any,
  });

  if (!skus.length) {
    throw new Error("No hay SKUs activos. Ejecuta primero seedProductCatalog.");
  }

  const stockItems = await stockItemRepo.find({
    where: {
      skuId: In(skus.map((s) => s.id)),
    } as any,
  });

  const stockItemMap = new Map<string, ProductCatalogStockItemEntity>(
    stockItems.map((s) => [s.skuId, s]),
  );

  const productIds = [...new Set(skus.map((s) => s.productId))];

  const products = await productRepo.find({
    where: {
      id: In(productIds),
    } as any,
  });

  const productMap = new Map<string, ProductCatalogProductEntity>(
    products.map((p) => [p.id, p]),
  );

  const activeSeries = await serieRepo.find({
    where: { isActive: true } as any,
  });

  const inSeriesByWarehouse = new Map<string, ProductCatalogDocumentSerieEntity>();
  const outSeriesByWarehouse = new Map<string, ProductCatalogDocumentSerieEntity>();

  for (const wh of warehouses) {
    const inSerie = activeSeries.find(
      (s: any) => s.warehouseId === wh.id && s.docType === DocType.IN,
    );
    const outSerie = activeSeries.find(
      (s: any) => s.warehouseId === wh.id && s.docType === DocType.OUT,
    );

    if (!inSerie) {
      throw new Error(`No hay serie activa IN para warehouse ${wh.id}`);
    }

    if (!outSerie) {
      throw new Error(`No hay serie activa OUT para warehouse ${wh.id}`);
    }

    inSeriesByWarehouse.set(wh.id, inSerie);
    outSeriesByWarehouse.set(wh.id, outSerie);
  }

  const totalPerType = totalDocs / 2;

  const plan: Array<{
    docType: DocType;
    direction: Direction;
    occurredAt: Date;
  }> = [];

  for (let i = 0; i < totalPerType; i++) {
    plan.push({
      docType: DocType.IN,
      direction: Direction.IN,
      occurredAt: randomDateInLastMonths(monthsBack),
    });
  }

  for (let i = 0; i < totalPerType; i++) {
    plan.push({
      docType: DocType.OUT,
      direction: Direction.OUT,
      occurredAt: randomDateInLastMonths(monthsBack),
    });
  }

  plan.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const inventoryCache = new Map<string, number>();

  const existingInventory = await inventoryRepo.find();
  for (const row of existingInventory) {
    inventoryCache.set(
      buildInventoryKey(row.warehouseId, row.stockItemId, row.locationId),
      Number(row.onHand ?? 0),
    );
  }

  let created = 0;

  for (let i = 0; i < plan.length; i++) {
    const movement = plan[i];
    const warehouse = randomItem(warehouses);

    const serie =
      movement.docType === DocType.IN
        ? inSeriesByWarehouse.get(warehouse.id)!
        : outSeriesByWarehouse.get(warehouse.id)!;

    const itemCount = randomInt(minItemsPerDoc, Math.min(maxItemsPerDoc, skus.length));
    const selectedSkus = takeRandomUnique(skus, itemCount);

    const firstSku = selectedSkus[0];
    const firstProduct = productMap.get(firstSku.productId);

    if (!firstProduct) {
      throw new Error(`Producto no encontrado para sku ${firstSku.id}`);
    }

    const serieId = (serie as any).id ?? (serie as any).serieId;
    if (!serieId) {
      throw new Error(`No se pudo resolver serieId para warehouse ${warehouse.id}`);
    }

    const nextNumber = Number((serie as any).nextNumber ?? 1);
    const correlative = nextNumber;

    await serieRepo.update(serieId, {
      nextNumber: nextNumber + 1,
    } as any);

    const savedDocument = await documentRepo.save({
      docType: movement.docType,
      productType: firstProduct.type,
      status: DocStatus.POSTED,
      serieId,
      correlative,
      fromWarehouseId: movement.docType === DocType.OUT ? warehouse.id : null,
      toWarehouseId: movement.docType === DocType.IN ? warehouse.id : null,
      referenceId: null,
      referenceType: null,
      note: `Seed masivo #${i + 1}`,
      createdBy,
      postedBy: createdBy,
      postedAt: movement.occurredAt,
      createdAt: movement.occurredAt,
    });

    const documentId = savedDocument.id;

    if (!documentId) {
      throw new Error("No se pudo obtener el id del documento insertado");
    }

    let insertedItemsCount = 0;

    for (const sku of selectedSkus) {
      const stockItem = stockItemMap.get(sku.id);
      if (!stockItem) continue;

      const stockItemId = stockItem.id;
      const key = buildInventoryKey(warehouse.id, stockItemId, null);
      const currentOnHand = inventoryCache.get(key) ?? 0;

      let qty = randomInt(1, 15);

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

      if (!itemId) {
        throw new Error(`No se pudo obtener el id del item del documento ${documentId}`);
      }

      const nextOnHand =
        movement.direction === Direction.IN
          ? currentOnHand + qty
          : currentOnHand - qty;

      inventoryCache.set(key, nextOnHand);

      const existingBalance = await inventoryRepo.findOne({
        where: {
          warehouseId: warehouse.id,
          stockItemId,
          locationId: null,
        },
      });

      if (existingBalance) {
        const reserved = Number(existingBalance.reserved ?? 0);

        await inventoryRepo.update(
          {
            warehouseId: warehouse.id,
            stockItemId,
          },
          {
            locationId: null,
            onHand: nextOnHand,
            reserved,
            available: nextOnHand - reserved,
            updatedAt: movement.occurredAt,
          } as any,
        );
      } else {
        await inventoryRepo.save({
          warehouseId: warehouse.id,
          stockItemId,
          locationId: null,
          onHand: nextOnHand,
          reserved: 0,
          available: nextOnHand,
          updatedAt: movement.occurredAt,
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

    if (insertedItemsCount === 0) {
      throw new Error(`El documento ${documentId} no tuvo items insertados`);
    }

    created++;

    if (created % 100 === 0) {
      console.log(`seedInventoryDocuments: ${created}/${totalDocs}`);
    }
  }

  console.log(`seedInventoryDocuments finalizado. Documentos creados: ${created}`);
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

function buildInventoryKey(
  warehouseId: string,
  stockItemId: string,
  locationId: string | null,
): string {
  return `${warehouseId}::${stockItemId}::${locationId ?? "null"}`;
}