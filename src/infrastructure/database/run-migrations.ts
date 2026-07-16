import { migrationDataSource } from "./typeorm.config";

const requiredTables = [
  "users",
  "messages",
  "message_user_states",
  "message_attachments",
  "production_orders",
];

async function assertRequiredTablesExist() {
  const rows = await migrationDataSource.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `,
    [requiredTables],
  );

  const existingTables = new Set(rows.map((row: { table_name: string }) => row.table_name));
  const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(
      [
        `Database schema is incomplete. Missing tables: ${missingTables.join(", ")}.`,
        "If typeorm_migrations already has records, the database volume is inconsistent and must be repaired or recreated before starting the app.",
      ].join(" "),
    );
  }
}

async function runMigrations() {
  console.log("Running database migrations...");
  await migrationDataSource.initialize();

  try {
    const migrations = await migrationDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log("No hay migraciones pendientes.");
    } else {
      console.log(`Migraciones ejecutadas: ${migrations.map((migration) => migration.name).join(", ")}`);
    }

    await assertRequiredTablesExist();
    console.log("Database schema check passed.");
  } finally {
    await migrationDataSource.destroy();
  }
}

runMigrations().catch((error) => {
  console.error("Error ejecutando migraciones:", error);
  process.exit(1);
});
