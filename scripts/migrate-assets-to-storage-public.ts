import 'dotenv/config';
import { migrateAssetsToStoragePublic } from '../src/shared/storage/migrate-assets-to-storage-public';
import { envs } from '../src/infrastructure/config/envs';

async function main() {
  const result = await migrateAssetsToStoragePublic({
    rootDir: process.cwd(),
    legacyAssetsDir: 'assets',
    storagePublicDir: envs.files.publicDir,
  });

  console.log(
    `Migracion de assets completada. copied=${result.copied} skipped=${result.skipped}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

