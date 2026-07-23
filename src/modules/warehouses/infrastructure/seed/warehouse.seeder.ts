import { DataSource } from "typeorm";
import { WarehouseEntity } from "../../adapters/out/persistence/typeorm/entities/warehouse";
import { WarehouseLocationEntity } from "../../adapters/out/persistence/typeorm/entities/warehouse-location";

type SeededWarehouse = {
  id: string;
  name: string;
};

export const DEFAULT_WAREHOUSE_IDS = {
  lima: "59179bc9-ff50-4816-bf16-801487c90e33",
  piura: "59190bfe-5738-4860-92c9-2b1c1394e6bc",
} as const;

export const DEFAULT_WAREHOUSES = [
  {
    id: DEFAULT_WAREHOUSE_IDS.piura,
    name: "Almacen Central (Piura)",
    department: "Piura",
    province: "Piura",
    district: "Piura",
    address: "Av. Principal 123",
  },
  {
    id: DEFAULT_WAREHOUSE_IDS.lima,
    name: "Almacen Central (Lima)",
    department: "Lima",
    province: "Lima",
    district: "Cercado",
    address: "Av. Principal 456",
  },
];

const LEGACY_NORTH_WAREHOUSE_ID = "48d49c65-dfb8-4abf-8a77-e44bb5f313af";

const DEFAULT_LOCATIONS = [
  { code: "A1", description: "Rack A1" },
  { code: "A2", description: "Rack A2" },
  { code: "A3", description: "Rack A3" },
];

export const seedWarehouses = async (dataSource: DataSource): Promise<SeededWarehouse[]> => {
  const warehouseRepo = dataSource.getRepository(WarehouseEntity);
  const locationRepo = dataSource.getRepository(WarehouseLocationEntity);
  const seeded: SeededWarehouse[] = [];

  for (const wh of DEFAULT_WAREHOUSES) {
    let entity = await warehouseRepo.findOne({ where: { id: wh.id } });
    if (!entity) {
      entity = await warehouseRepo.save(warehouseRepo.create({ ...wh, isActive: true }));
      console.log(`Almacen creado: ${entity.name}`);
    } else {
      entity = await warehouseRepo.save({ ...entity, ...wh, isActive: true });
      console.log(`Almacen ${entity.name} actualizado`);
    }

    for (const loc of DEFAULT_LOCATIONS) {
      const exists = await locationRepo.findOne({
        where: { warehouseId: entity.id, code: loc.code },
      });
      if (exists) {
        console.log(
          `Location ${loc.code} ya existe en ${entity.name}, omitiendo...`,
        );
        continue;
      }
      await locationRepo.save(
        locationRepo.create({
          warehouseId: entity.id,
          code: loc.code,
          description: loc.description,
          isActive: true,
        }),
      );
      console.log(`Location ${loc.code} creada en ${entity.name}`);
    }

    seeded.push({ id: entity.id, name: entity.name });
  }

  const legacyNorth = await warehouseRepo.findOne({ where: { id: LEGACY_NORTH_WAREHOUSE_ID } });
  if (legacyNorth?.isActive) {
    await warehouseRepo.save({ ...legacyNorth, isActive: false });
    console.log(`Almacen legado ${legacyNorth.name} desactivado`);
  }

  return seeded;
};
