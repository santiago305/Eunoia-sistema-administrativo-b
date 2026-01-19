import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';
import { Role } from './src/modules/roles/infrastructure/orm-entities/role.entity';
import { User } from './src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { seedRoles } from './src/modules/roles/infrastructure/seed/role.seeder';
import { seedUser } from './src/modules/users/infrastructure/seed/user.seeder';

/**
 * Script de ejecución que inicializa la base de datos con roles predefinidos.
 *
 * Este script crea una conexión temporal a la base de datos utilizando TypeORM y
 * ejecuta la función `seedRoles` para insertar roles definidos en el sistema.
 * Luego, cierra la conexión.
 *
 * @remarks
 * - Se recomienda ejecutar este script solo en entornos de desarrollo o staging.
 * - Asegúrate de que la base de datos ya esté sincronizada (no usa `synchronize: true`).
 *
 * @example
 * ```bash
 * ts-node seed.ts
 * # o si usas un package script:
 * npm run seed
 * ```
 */
const dataSource = new DataSource({
  type: 'postgres',
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  synchronize: true, // ya sincronizó antes
  logging: false,
  entities: [Role, User,], // puedes agregar más entidades si quieres hacer seed de varias tablas
});

dataSource
  .initialize()
  .then(async () => {
    console.log('Iniciando seed...');
    await seedRoles(dataSource); // ejecuta la siembra de roles
    await seedUser(dataSource); // ejecuta la siembra de usuario
    await dataSource.destroy(); // cierra la conexión con la DB
    console.log('Seeding completo!');
  })
  .catch((err) => {
    console.error('Error al hacer seed:', err);
  });
