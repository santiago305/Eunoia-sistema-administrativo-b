import { DataSource } from "typeorm";
import { ProductCatalogInventoryEntity } from "../../adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogStockItemEntity } from "../../adapters/out/persistence/typeorm/entities/stock-item.entity";
import { WarehouseLocationEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
const INITIAL_UNITS_PER_SKU = 100;

export const seedProductCatalogInventory = async (dataSource: DataSource): Promise<void> => {
  const warehouseRepo = dataSource.getRepository(WarehouseEntity);
  const locationRepo = dataSource.getRepository(WarehouseLocationEntity);
  const stockItemRepo = dataSource.getRepository(ProductCatalogStockItemEntity);
  const inventoryRepo = dataSource.getRepository(ProductCatalogInventoryEntity);
  const warehouse = await warehouseRepo.findOne({ where: { name: "Almacen Central" } });
  if (!warehouse) {
    throw new Error("Almacen Central no encontrado. Ejecuta seedWarehouses primero.");
  }
  const defaultLocation = await locationRepo.findOne({
    where: { warehouseId: warehouse.id, code: "A1" },
  });
  const locationId = defaultLocation?.id ?? null;

  const stockItems = await stockItemRepo.find();
  if (!stockItems.length) {
    throw new Error("No hay stock items. Ejecuta seedProductCatalog primero.");
  }

  for (const stockItem of stockItems) {
    const existing = await inventoryRepo.findOne({
      where: { warehouseId: warehouse.id, stockItemId: stockItem.id, locationId },
    });

    if (existing) {
      await inventoryRepo.update(
        {
          warehouseId: warehouse.id,
          stockItemId: stockItem.id,
          locationId,
        },
        {
        onHand: INITIAL_UNITS_PER_SKU,
        reserved: 0,
        available: INITIAL_UNITS_PER_SKU,
        },
      );
      continue;
    }

    await inventoryRepo.save({
      warehouseId: warehouse.id,
      stockItemId: stockItem.id,
      locationId,
      onHand: INITIAL_UNITS_PER_SKU,
      reserved: 0,
      available: INITIAL_UNITS_PER_SKU,
    });
  }

  console.log(`Stock inicial cargado para ${stockItems.length} SKU en Almacen Central`);
};
