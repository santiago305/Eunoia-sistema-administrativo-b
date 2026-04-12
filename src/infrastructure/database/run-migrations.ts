import { migrationDataSource } from "./typeorm.config";

async function runMigrations() {
  await migrationDataSource.initialize();

  try {
    const migrations = await migrationDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log("No hay migraciones pendientes.");
      return;
    }

    console.log(`Migraciones ejecutadas: ${migrations.map((migration) => migration.name).join(", ")}`);
  } finally {
    await migrationDataSource.destroy();
  }
}

runMigrations().catch((error) => {
  console.error("Error ejecutando migraciones:", error);
  process.exit(1);
});
