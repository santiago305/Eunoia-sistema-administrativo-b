import { DataSource } from "typeorm";
import { ProductCatalogInventoryEntity } from "../../adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogSkuEntity } from "../../adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "../../adapters/out/persistence/typeorm/entities/stock-item.entity";
import { WarehouseLocationEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";

type WarehouseStockSeed = {
  customSku: string;
  onHand: number;
  locationCode?: string | null;
};

type WarehouseSeedConfig = {
  warehouseName: string;
  items: WarehouseStockSeed[];
};

const INVENTORY_SEED: WarehouseSeedConfig[] = [
  {
    warehouseName: "Almacen Central",
    items: [
      { customSku: "JABON-01", onHand: 58, locationCode: "A1" },
      { customSku: "JABON-02", onHand: 44, locationCode: "A2" },
      { customSku: "ARCILL-01", onHand: 39, locationCode: "A3" },
      { customSku: "ARCILL-02", onHand: 52, locationCode: "A1" },
      { customSku: "AMPOLL-01", onHand: 31, locationCode: "A2" },
    ],
  },
  {
    warehouseName: "Almacen Norte",
    items: [
      { customSku: "JABON-01", onHand: 34, locationCode: "A2" },
      { customSku: "JABON-02", onHand: 47, locationCode: null },
      { customSku: "ARCILL-01", onHand: 41, locationCode: "A1" },
      { customSku: "ARCILL-02", onHand: 30, locationCode: null },
      { customSku: "AMPOLL-01", onHand: 56, locationCode: "A3" },
    ],
  },
  {
    warehouseName: "Almacen Sur",
    items: [
      { customSku: "JABON-01", onHand: 48, locationCode: "A1" },
      { customSku: "JABON-02", onHand: 36, locationCode: "A2" },
      { customSku: "ARCILL-01", onHand: 54, locationCode: null },
      { customSku: "ARCILL-02", onHand: 42, locationCode: "A1" },
      { customSku: "AMPOLL-01", onHand: 60, locationCode: "A2" },
    ],
  },
];

export const seedProductCatalogInventory = async (dataSource: DataSource): Promise<void> => {
  const warehouseRepo = dataSource.getRepository(WarehouseEntity);
  const locationRepo = dataSource.getRepository(WarehouseLocationEntity);
  const skuRepo = dataSource.getRepository(ProductCatalogSkuEntity);
  const stockItemRepo = dataSource.getRepository(ProductCatalogStockItemEntity);
  const inventoryRepo = dataSource.getRepository(ProductCatalogInventoryEntity);

  for (const warehouseSeed of INVENTORY_SEED) {
    const warehouse = await warehouseRepo.findOne({ where: { name: warehouseSeed.warehouseName } });
    if (!warehouse) {
      throw new Error(`Almacen ${warehouseSeed.warehouseName} no encontrado. Ejecuta seedWarehouses primero.`);
    }

    for (const item of warehouseSeed.items) {
      const sku = await skuRepo.findOne({ where: { customSku: item.customSku } });
      if (!sku) {
        throw new Error(`SKU ${item.customSku} no encontrado. Ejecuta seedProductCatalog primero.`);
      }

      const stockItem = await stockItemRepo.findOne({ where: { skuId: sku.id } });
      if (!stockItem) {
        throw new Error(`Stock item para SKU ${item.customSku} no encontrado.`);
      }

      let locationId: string | null = null;
      if (item.locationCode) {
        const location = await locationRepo.findOne({
          where: { warehouseId: warehouse.id, code: item.locationCode },
        });
        if (!location) {
          throw new Error(`Ubicacion ${item.locationCode} no encontrada en ${warehouseSeed.warehouseName}.`);
        }
        locationId = location.id;
      }

      await inventoryRepo.save({
        warehouseId: warehouse.id,
        stockItemId: stockItem.id,
        locationId,
        onHand: item.onHand,
        reserved: 0,
        available: item.onHand,
      });
    }

    console.log(`Stock inicial cargado para ${warehouseSeed.items.length} SKU en ${warehouseSeed.warehouseName}`);
  }
};
