import { Role } from '../../adapters/out/persistence/typeorm/entities/role.entity';
import { DataSource } from 'typeorm';
import { RoleType } from 'src/shared/constantes/constants';

/**
 * Script de seed que inserta roles predefinidos en la base de datos.
 *
 * Este seeder utiliza el `DataSource` de TypeORM para acceder al repositorio de `Role`
 * y asegura que cada rol definido en `RoleType` exista en la base de datos.
 * Si un rol ya existe, no se vuelve a insertar.
 *
 * @param dataSource - Instancia de conexiAn a la base de datos proporcionada por TypeORM.
 *
 * @example
 * ```ts
 * import { seedRoles } from './seeds/seed-roles';
 * import { AppDataSource } from './data-source';
 *
 * AppDataSource.initialize().then(async (dataSource) => {
 *   await seedRoles(dataSource);
 * });
 * ```
 */
export const seedRoles = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Role);

  const rolesToInsert = Object.values(RoleType).map((roleName) =>
    repo.create({ description: roleName })
  );

  for (const role of rolesToInsert) {
    const exists = await repo.findOneBy({ description: role.description});
    if (!exists) {
      await repo.save(role);
      console.log(`Rol insertado: ${role.description}`);
    } else {
      console.log(`Rol ya existe: ${role.description}`);
    }
  }
};

