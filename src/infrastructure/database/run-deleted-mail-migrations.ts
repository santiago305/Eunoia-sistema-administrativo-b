import { DataSource } from 'typeorm';
import { envs } from '../config/envs';
import { CreateDeletedMailArchive20260522190000 } from './migrations/20260522190000-create-deleted-mail-archive';
import { CreateDeletedMailArchiveOperations20261010020000 } from './migrations/20261010020000-create-deleted-mail-archive-operations';

async function main() {
  if (!envs.mail.deletedDb.enabled) {
    throw new Error('MAIL_DELETED_DB_ENABLED=true y credenciales completas son obligatorios');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: envs.mail.deletedDb.host!,
    port: Number(envs.mail.deletedDb.port),
    username: envs.mail.deletedDb.username!,
    password: envs.mail.deletedDb.password ?? '',
    database: envs.mail.deletedDb.name!,
    synchronize: false,
    migrationsTableName: 'typeorm_deleted_mail_migrations',
    migrations: [
      CreateDeletedMailArchive20260522190000,
      CreateDeletedMailArchiveOperations20261010020000,
    ],
  });

  await dataSource.initialize();
  try {
    const migrations = await dataSource.runMigrations();
    console.log(`Migraciones de correo eliminado ejecutadas: ${migrations.map((migration) => migration.name).join(', ') || 'ninguna'}`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
