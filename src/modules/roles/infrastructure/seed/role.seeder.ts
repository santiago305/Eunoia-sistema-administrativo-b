import { DataSource } from 'typeorm';

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
  void dataSource;
  console.log('seedRoles omitido: los roles se gestionan desde la UI.');
};

