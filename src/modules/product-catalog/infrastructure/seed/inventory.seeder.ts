import { DataSource } from "typeorm";
import { ProductCatalogInventoryEntity } from "../../adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogStockItemEntity } from "../../adapters/out/persistence/typeorm/entities/stock-item.entity";
import { WarehouseLocationEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
const MIN_UNITS_PER_SKU = 80;
const MAX_UNITS_PER_SKU = 160;

export const seedProductCatalogInventory = async (dataSource: DataSource): Promise<void> => {
  const warehouseRepo = dataSource.getRepository(WarehouseEntity);
  const locationRepo = dataSource.getRepository(WarehouseLocationEntity);
  const stockItemRepo = dataSource.getRepository(ProductCatalogStockItemEntity);
  const inventoryRepo = dataSource.getRepository(ProductCatalogInventoryEntity);
  const warehouses = await warehouseRepo.find({ where: { isActive: true } as any });
  if (!warehouses.length) {
    throw new Error("No hay almacenes activos. Ejecuta seedWarehouses primero.");
  }

  const stockItems = await stockItemRepo.find();
  if (!stockItems.length) {
    throw new Error("No hay stock items. Ejecuta seedProductCatalog primero.");
  }

  const existingBalances = await inventoryRepo.find();
  for (const row of existingBalances) {
    const safeOnHand = Math.max(0, Number(row.onHand ?? 0));
    const safeReserved = Math.max(0, Math.min(Number(row.reserved ?? 0), safeOnHand));
    await inventoryRepo.update(
      {
        warehouseId: row.warehouseId,
        stockItemId: row.stockItemId,
        locationId: row.locationId,
      },
      {
        onHand: safeOnHand,
        reserved: safeReserved,
        available: safeOnHand - safeReserved,
      },
    );
  }

  for (const warehouse of warehouses) {
    const defaultLocation = await locationRepo.findOne({
      where: { warehouseId: warehouse.id, code: "A1" },
    });
    const locationId = defaultLocation?.id ?? null;

    for (const stockItem of stockItems) {
      const existing = await inventoryRepo.findOne({
        where: { warehouseId: warehouse.id, stockItemId: stockItem.id, locationId },
      });
      const initialUnits = randomInt(MIN_UNITS_PER_SKU, MAX_UNITS_PER_SKU);

      if (existing) {
        await inventoryRepo.update(
          {
            warehouseId: warehouse.id,
            stockItemId: stockItem.id,
            locationId,
          },
          {
            onHand: initialUnits,
            reserved: 0,
            available: initialUnits,
          },
        );
        continue;
      }

      await inventoryRepo.save({
        warehouseId: warehouse.id,
        stockItemId: stockItem.id,
        locationId,
        onHand: initialUnits,
        reserved: 0,
        available: initialUnits,
      });
    }

    console.log(`Stock inicial cargado para ${stockItems.length} SKU en ${warehouse.name}`);
  }
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
