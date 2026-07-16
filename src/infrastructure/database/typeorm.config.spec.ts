import { envs } from '../config/envs';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  getMigrationDataSourceOptions,
  getTypeOrmModuleOptions,
} from './typeorm.config';

describe('getTypeOrmModuleOptions', () => {
  const previousNodeEnv = envs.nodeEnv;

  afterEach(() => {
    (envs as { nodeEnv: string }).nodeEnv = previousNodeEnv;
  });

  it('keeps synchronize disabled in development', () => {
    (envs as { nodeEnv: string }).nodeEnv = 'development';

    expect(getTypeOrmModuleOptions().synchronize).toBe(false);
  });

  it('keeps synchronize disabled in production', () => {
    (envs as { nodeEnv: string }).nodeEnv = 'production';

    expect(getTypeOrmModuleOptions().synchronize).toBe(false);
  });

  it('registers every migration file in the migration datasource', () => {
    const migrationsDir = join(__dirname, 'migrations');
    const expectedMigrationNames = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .flatMap((file) => {
        const migrationModule = require(join(migrationsDir, file));
        return Object.values(migrationModule)
          .filter(
            (value): value is Function =>
              typeof value === 'function' &&
              typeof value.prototype?.up === 'function',
          )
          .map((migration) => migration.name);
      });

    const registeredMigrations = (getMigrationDataSourceOptions().migrations ??
      []) as Array<string | Function>;
    const registeredMigrationNames = registeredMigrations.map((migration) =>
      typeof migration === 'function' ? migration.name : String(migration),
    );

    expect(registeredMigrationNames).toEqual(
      expect.arrayContaining(expectedMigrationNames),
    );
  });

  it('registers recurring purchase migrations required by the runtime entities', () => {
    const registeredMigrations = (getMigrationDataSourceOptions().migrations ??
      []) as Array<string | Function>;
    const registeredMigrationNames = registeredMigrations.map((migration) =>
      typeof migration === 'function' ? migration.name : String(migration),
    );

    expect(registeredMigrationNames).toEqual(
      expect.arrayContaining([
        'CreateRecurringPurchases20260626090000',
        'AddRecurringPurchaseBillingAnchorDay20260710154000',
        'AddRecurringPurchaseReminderDeliveries20260710165000',
        'AddRecurringPurchaseDueNotificationPermission20260710172000',
        'AddRecurringPurchasePaymentPermissions20260711100000',
        'AddRecurringPurchaseRelations20260711120000',
        'AddRecurringPurchaseExportPermission20260712120000',
      ]),
    );
  });

  it('keeps migration SQL aware of every runtime entity table', () => {
    const migrationsDir = join(__dirname, 'migrations');
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
      .join('\n');

    const runtimeTables = [
      'approval_requests',
      'deleted_mail_audit_logs',
      'deleted_mail_message_user_states',
      'deleted_mail_messages',
      'document_series',
      'mail_attachment_user_refs',
      'mail_message_action_recipients',
      'mail_message_actions',
      'mail_storage_quotas',
      'message_label_assignments',
      'message_labels',
      'message_message_labels',
      'message_user_states',
      'notification_module_label_configs',
      'pc_attributes',
      'pc_catalog_publications',
      'pc_equivalences',
      'pc_inventory_document_items',
      'pc_inventory_documents',
      'pc_inventory_ledger',
      'pc_products',
      'pc_recipe_items',
      'pc_recipes',
      'pc_sku_attribute_values',
      'pc_units',
      'production_order_items',
      'products',
      'purchase_history_events',
      'purchase_processing_approvals',
      'security_ip_bans',
      'security_ip_violations',
      'security_reason_catalog',
      'sessions',
      'supplier_skus',
    ];

    for (const table of runtimeTables) {
      expect(migrationSql).toContain(table);
    }
  });

  it('keeps the sessions migration aligned with the runtime session entity', () => {
    const migrationSql = readFileSync(
      join(__dirname, 'migrations', '20260410000000-create-foundation-schema.ts'),
      'utf8',
    );

    for (const column of [
      'id uuid PRIMARY KEY',
      'refresh_token_hash',
      'last_used_at',
      'expires_at',
      'revoked_at',
      'ip varchar',
      'user_agent varchar',
      'device_name',
    ]) {
      expect(migrationSql).toContain(column);
    }

    expect(migrationSql).not.toMatch(/\bsession_id\s+uuid\s+PRIMARY KEY/);
    expect(migrationSql).not.toMatch(/\btoken_hash\s+varchar/);
    expect(migrationSql).not.toMatch(/\bip_address\s+varchar/);
  });
});
