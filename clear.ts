import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';

const dataSource = new DataSource({
  type: 'postgres',
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  synchronize: false,
  logging: false,
  entities: [],
});

dataSource
  .initialize()
  .then(async () => {
    await dataSource.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await dataSource.query(`CREATE SCHEMA public`);
    await dataSource.query(`GRANT ALL ON SCHEMA public TO public`);
    console.log('[Clear] Se elimino el esquema public y el historial de migraciones.');
    console.log('[Clear] Ejecuta pnpm run migrate para reconstruir el esquema desde migraciones.');
    await dataSource.destroy();
  })
  .catch((err) => {
    console.error('[Clear] Error al inicializar la conexion:', err);
    process.exitCode = 1;
  });
