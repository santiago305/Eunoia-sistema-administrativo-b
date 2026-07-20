import { DataSource } from 'typeorm';
import { getMigrationDataSourceOptions } from './typeorm.config';
import { Role } from '../../modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from '../../modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { ProductCatalogUnitEntity } from '../../modules/product-catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { UbigeoDepartmentEntity } from '../../modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-department.entity';
import { UbigeoProvinceEntity } from '../../modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity';
import { UbigeoDistrictEntity } from '../../modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity';
import { seedUser } from '../../modules/users/infrastructure/seed/user.seeder';
import { seedUbigeo } from '../../modules/ubigeo/infrastructure/seed/ubigeo.seeder';
import { seedUnits } from '../../modules/product-catalog/infrastructure/seed/unit.seeder';

const baseSeedEntities = [
  Role,
  User,
  ProductCatalogUnitEntity,
  UbigeoDepartmentEntity,
  UbigeoProvinceEntity,
  UbigeoDistrictEntity,
];

export const createBaseSeedDataSource = (): DataSource =>
  new DataSource({
    ...getMigrationDataSourceOptions(),
    entities: baseSeedEntities,
  });

/** Carga únicamente los catálogos y accesos necesarios para operar una instalación vacía. */
export async function runBaseSeed(dataSource = createBaseSeedDataSource()): Promise<void> {
  const mustDestroy = !dataSource.isInitialized;

  if (mustDestroy) {
    await dataSource.initialize();
  }

  try {
    await seedUser(dataSource);
    await seedUbigeo(dataSource);
    await seedUnits(dataSource);
    console.log('Datos base cargados correctamente.');
  } finally {
    if (mustDestroy && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  runBaseSeed().catch((error) => {
    console.error('Error al cargar los datos base:', error);
    process.exitCode = 1;
  });
}
