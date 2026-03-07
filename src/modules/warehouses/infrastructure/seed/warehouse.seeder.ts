import { DataSource } from "typeorm";
import { WarehouseEntity } from "../../adapters/out/persistence/typeorm/entities/warehouse";
import { WarehouseLocationEntity } from "../../adapters/out/persistence/typeorm/entities/warehouse-location";

type SeededWarehouse = {
  id: string;
  name: string;
};

const DEFAULT_WAREHOUSES = [
  {
    name: "Almacen Central",
    department: "Lima",
    province: "Lima",
    district: "Cercado",
    address: "Av. Principal 123",
  },
  {
    name: "Almacen Norte",
    department: "Lima",
    province: "Lima",
    district: "San Martin de Porres",
    address: "Jr. Los Olivos 456",
  },
  {
    name: "Almacen Sur",
    department: "Lima",
    province: "Lima",
    district: "Villa El Salvador",
    address: "Av. Industrial 789",
  },
];

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
    let entity = await warehouseRepo.findOne({ where: { name: wh.name } });
    if (!entity) {
      entity = await warehouseRepo.save(warehouseRepo.create({ ...wh, isActive: true }));
      console.log(`Almacen creado: ${entity.name}`);
    } else {
      console.log(`Almacen ${entity.name} ya existe, omitiendo...`);
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

  return seeded;
};
