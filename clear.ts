import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';
import { Role } from './src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from './src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { DocumentSerie } from 'src/modules/inventory/adapters/out/typeorm/entities/document_serie.entity';
import { UnitEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/unit.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  // Borra tablas existentes del schema y recrea las de estas entidades.
  // Esto evita ALTERs sobre tablas antiguas (ej. products sin base_unit_id).
  dropSchema: true,
  synchronize: true,
  logging: false,
  entities: [Role, User, DocumentSerie, UnitEntity],
});

dataSource
  .initialize()
  .then(async () => {
    console.log('[Clear] Esquema eliminado y recreado correctamente.');
    await dataSource.destroy();
    console.log('[Clear] Base de datos lista para seed.');
  })
  .catch((err) => {
    console.error('[Clear] Error al inicializar la conexion:', err);
  });
