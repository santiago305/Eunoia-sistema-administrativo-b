# Production Migrations Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm run migrate` the only mechanism required to build the complete PostgreSQL schema from an empty database, so production can run with `synchronize: false`.

**Architecture:** Treat migrations as the source of truth. Move all schema that currently exists only in `src/infrastructure/database/eunoia.sql`, module-local `.sql` files, seeders, or `clear.ts` synchronization into registered TypeORM migrations under `src/infrastructure/database/migrations`. Add automated tests that compare runtime TypeORM entities against registered migrations so this cannot regress.

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL, pnpm, Jest, ts-node.

## Global Constraints

- Production must use `synchronize: false`.
- `pnpm run migrate` must create every runtime table from an empty database.
- `clear.ts` must not validate schema by using `synchronize: true`.
- Existing production data migrations must remain idempotent and safe to rerun.
- Do not delete or rewrite existing historical migrations unless a new compatibility migration can safely supersede them.
- Keep migration files in `src/infrastructure/database/migrations`.
- Register every migration class in `src/infrastructure/database/typeorm.config.ts`.
- Verification must include backend build, migration config tests, and a clean-database migration run.

---

## Current Risk Summary

The current backend build passes, but production migration readiness does not. `pnpm run migrate` only executes the classes listed in `src/infrastructure/database/typeorm.config.ts`; it does not execute `src/infrastructure/database/eunoia.sql` or module-local SQL files.

Known tables/entities missing from registered migrations:

```text
approval_requests
deleted_mail_audit_logs
deleted_mail_message_user_states
deleted_mail_messages
document_series
mail_attachment_user_refs
mail_message_action_recipients
mail_message_actions
mail_storage_quotas
message_label_assignments
message_labels
message_message_labels
message_user_states
notification_module_label_configs
pc_attributes
pc_catalog_publications
pc_equivalences
pc_inventory_document_items
pc_inventory_documents
pc_inventory_ledger
pc_products
pc_recipe_items
pc_recipes
pc_sku_attribute_values
pc_units
production_order_items
products
purchase_history_events
purchase_processing_approvals
security_ip_bans
security_ip_violations
security_reason_catalog
supplier_skus
```

Known migration-order hazards:

```text
20260412000000-add-listing-indexes.ts references suppliers/warehouses/warehouse_locations.
20260414000000-expand-payment-method-relations.ts references supplier_methods/company_methods.
20260418000000-add-partial-production-status.ts references production_status/production_orders.
20260502000000-add-sku-image-column.ts references pc_skus.
20260519010000-create-packs-core.ts references pc_skus.
20260525000000-create-sale-orders-core.ts references pc_skus.
```

## File Structure

- Modify: `src/infrastructure/database/typeorm.config.ts`
  - Register new baseline and module migration classes.
- Modify: `src/infrastructure/database/typeorm.config.spec.ts`
  - Add tests that enforce registered migrations cover runtime entities and that dangerous SQL files are not orphaned.
- Modify: `clear.ts`
  - Replace `synchronize: true` reset with an explicit schema drop/reset that leaves schema creation to `pnpm run migrate`.
- Create: `src/infrastructure/database/migrations/20260410000000-create-foundation-schema.ts`
  - Create extensions, enums, and oldest baseline tables currently assumed by later migrations.
- Create: `src/infrastructure/database/migrations/20260506010000-create-purchase-approval-history.ts`
  - Port `src/modules/purchases/infrastructure/migrations/20260506010000-create-approvals-history-and-payment-status.sql`.
- Create: `src/infrastructure/database/migrations/20260512090000-create-mail-center-foundation.ts`
  - Port mail foundation SQL for `message_user_states`, labels, assignments, and related indexes.
- Create: `src/infrastructure/database/migrations/20260512103000-create-message-message-labels.ts`
  - Port message-label join table SQL.
- Create: `src/infrastructure/database/migrations/20260514093000-create-mail-partitions.ts`
  - Port mail partition setup if runtime still depends on partition tables.
- Create: `src/infrastructure/database/migrations/20260515113000-align-mail-model.ts`
  - Port mail model alignment SQL.
- Create: `src/infrastructure/database/migrations/20260515121500-create-mail-partitioning-status-logs.ts`
  - Port partitioning status logs if still queried by mail jobs.
- Create: `src/infrastructure/database/migrations/20260516093000-create-notification-module-label-configs.ts`
  - Port notification label config SQL.
- Create: `src/infrastructure/database/migrations/20260520113000-create-mail-message-actions.ts`
  - Port message action tables SQL.
- Create: `src/infrastructure/database/migrations/20260522183000-create-mail-storage-quotas.ts`
  - Port storage quota tables SQL.
- Create: `src/infrastructure/database/migrations/20260618000000-create-product-catalog-core.ts`
  - Create product catalog tables currently only in `eunoia.sql` or sync-created entities.
- Create: `src/infrastructure/database/migrations/20260618100000-create-security-audit-core.ts`
  - Create `security_reason_catalog`, `security_ip_violations`, and `security_ip_bans`.
- Create: `src/infrastructure/database/migrations/20260618110000-create-production-core.ts`
  - Create `production_status`, `production_orders`, and `production_order_items` before later production migrations.
- Modify: `src/modules/product-catalog/infrastructure/seed/equivalence.seeder.ts`
  - Remove schema creation from the seeder after `pc_equivalences` is created by migration.
- Optional modify: `src/infrastructure/database/eunoia.sql`
  - Add a header comment marking it as legacy reference only, not production migration input.

## Migration Ordering Strategy

The cleanest path is to add idempotent baseline migrations with timestamps earlier than dependent migrations, then register them before existing dependent classes.

Required order:

```text
20260410000000-create-foundation-schema.ts
20260411000000-enable-unaccent-extension.ts
20260412000000-add-listing-indexes.ts
20260414000000-expand-payment-method-relations.ts
20260418000000-add-partial-production-status.ts
20260502000000-add-sku-image-column.ts
...
```

`CreateFoundationSchema20260410000000` must create at minimum:

```text
uuid-ossp extension
pgcrypto extension
companies
roles
permissions
role_permissions
users
sessions
products
suppliers
payment_methods
company_methods
supplier_methods
warehouses
warehouse_locations
production_status enum
production_orders
pc_products
pc_skus
pc_attributes
pc_sku_attribute_values
pc_units
document_series
supplier_skus
```

The product-catalog, security, purchase, mail, and production follow-up migrations may be split from foundation if dependency order remains valid. If a later existing migration references a table, that table must exist before that later migration runs.

---

### Task 1: Add Migration Coverage Tests

**Files:**
- Modify: `src/infrastructure/database/typeorm.config.spec.ts`

**Interfaces:**
- Consumes: TypeORM `getMigrationDataSourceOptions()`.
- Produces: test coverage that fails when runtime entity tables are absent from registered migration SQL.

- [ ] **Step 1: Add imports**

Add these imports to `src/infrastructure/database/typeorm.config.spec.ts`:

```ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
```

If `readdirSync` and `join` are already imported, merge them instead of duplicating imports.

- [ ] **Step 2: Add the missing-table regression test**

Add this test inside `describe('getTypeOrmModuleOptions', () => { ... })`:

```ts
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
      'supplier_skus',
    ];

    for (const table of runtimeTables) {
      expect(migrationSql).toContain(table);
    }
  });
```

- [ ] **Step 3: Run test to verify it fails before migrations are added**

Run:

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
```

Expected: FAIL showing one or more missing table strings.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/database/typeorm.config.spec.ts
git commit -m "test: require migration coverage for runtime tables"
```

---

### Task 2: Create Foundation Schema Migration

**Files:**
- Create: `src/infrastructure/database/migrations/20260410000000-create-foundation-schema.ts`
- Modify: `src/infrastructure/database/typeorm.config.ts`

**Interfaces:**
- Consumes: table definitions from `src/infrastructure/database/eunoia.sql` and current TypeORM entity column names.
- Produces: `CreateFoundationSchema20260410000000`.

- [ ] **Step 1: Create migration file**

Create `src/infrastructure/database/migrations/20260410000000-create-foundation-schema.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFoundationSchema20260410000000 implements MigrationInterface {
  name = "CreateFoundationSchema20260410000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_status') THEN
          CREATE TYPE production_status AS ENUM ('DRAFT','IN_PROGRESS','PARTIAL','COMPLETED','CANCELLED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS companies (
        company_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        ruc varchar(11) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        email varchar(255),
        phone varchar(50),
        address text,
        logo_url text,
        isotype_url text,
        certificate_url text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL UNIQUE,
        description varchar(255),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar(255) NOT NULL UNIQUE,
        password varchar(255) NOT NULL,
        first_name varchar(120),
        last_name varchar(120),
        avatar_url text,
        role_id uuid REFERENCES roles(role_id),
        company_id uuid REFERENCES companies(company_id),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash varchar(255) NOT NULL,
        user_agent text,
        ip_address varchar(80),
        revoked_at timestamptz,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        doc_type varchar(20),
        doc_number varchar(30),
        name varchar(255) NOT NULL,
        email varchar(255),
        phone varchar(50),
        address text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        method_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL UNIQUE,
        description varchar(255),
        requires_voucher boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_methods (
        supplier_method_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
        method_id uuid NOT NULL REFERENCES payment_methods(method_id),
        number varchar(100),
        requires_voucher boolean NOT NULL DEFAULT false,
        is_default boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_methods (
        company_method_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id uuid NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        method_id uuid NOT NULL REFERENCES payment_methods(method_id),
        number varchar(100),
        requires_voucher boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        department varchar NOT NULL,
        province varchar NOT NULL,
        district varchar NOT NULL,
        address varchar,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        code varchar NOT NULL,
        description varchar,
        is_active boolean NOT NULL DEFAULT true
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_products (
        product_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL UNIQUE,
        type varchar(50) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_units (
        unit_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(20) NOT NULL UNIQUE,
        name varchar(100) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_skus (
        sku_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id uuid NOT NULL REFERENCES pc_products(product_id) ON DELETE CASCADE,
        sku varchar(100) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        image_url text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_attributes (
        attribute_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(60) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_sku_attribute_values (
        sku_attribute_value_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        attribute_id uuid NOT NULL REFERENCES pc_attributes(attribute_id) ON DELETE CASCADE,
        value varchar(255) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_series (
        serie_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        warehouse_id uuid REFERENCES warehouses(id),
        doc_type varchar(50) NOT NULL,
        serie varchar(20) NOT NULL,
        current_number int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_skus (
        supplier_sku_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        supplier_code varchar(120),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_orders (
        production_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        doc_type varchar(50) NOT NULL,
        serie_id uuid NOT NULL REFERENCES document_series(serie_id),
        correlative int NOT NULL,
        status production_status NOT NULL DEFAULT 'DRAFT',
        reference varchar,
        manufacture_date timestamptz NOT NULL,
        created_by uuid NOT NULL REFERENCES users(user_id),
        updated_by varchar,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        image_prodution jsonb NOT NULL DEFAULT '[]'::jsonb
      );
    `);
  }

  public async down(): Promise<void> {
    // Baseline migration is intentionally not destructive.
  }
}
```

- [ ] **Step 2: Register migration first**

In `src/infrastructure/database/typeorm.config.ts`, import:

```ts
import { CreateFoundationSchema20260410000000 } from "./migrations/20260410000000-create-foundation-schema";
```

Add it as the first item in `migrations: []`:

```ts
    CreateFoundationSchema20260410000000,
```

- [ ] **Step 3: Run migration config test**

Run:

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
```

Expected: fewer missing-table failures than Task 1.

- [ ] **Step 4: Run backend build**

Run:

```bash
pnpm run build
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/database/migrations/20260410000000-create-foundation-schema.ts src/infrastructure/database/typeorm.config.ts
git commit -m "feat: add foundation schema migration"
```

---

### Task 3: Port Product Catalog Tables

**Files:**
- Create: `src/infrastructure/database/migrations/20260618000000-create-product-catalog-core.ts`
- Modify: `src/infrastructure/database/typeorm.config.ts`
- Modify: `src/modules/product-catalog/infrastructure/seed/equivalence.seeder.ts`

**Interfaces:**
- Produces: `CreateProductCatalogCore20260618000000`.
- Removes seeder-owned schema creation for `pc_equivalences`.

- [ ] **Step 1: Create product catalog migration**

Create `src/infrastructure/database/migrations/20260618000000-create-product-catalog-core.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductCatalogCore20260618000000 implements MigrationInterface {
  name = "CreateProductCatalogCore20260618000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_recipes (
        recipe_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL UNIQUE REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        yield_qty numeric(12,6) NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_recipe_items (
        recipe_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipe_id uuid NOT NULL REFERENCES pc_recipes(recipe_id) ON DELETE CASCADE,
        material_sku_id uuid NOT NULL REFERENCES pc_skus(sku_id),
        quantity numeric(12,6) NOT NULL,
        unit_id uuid REFERENCES pc_units(unit_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_catalog_publications (
        publication_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        title varchar(255),
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory (
        inventory_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        location_id uuid REFERENCES warehouse_locations(id),
        quantity numeric(12,6) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory_documents (
        document_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        serie_id uuid REFERENCES document_series(serie_id),
        warehouse_id uuid REFERENCES warehouses(id),
        doc_type varchar(50) NOT NULL,
        correlative int,
        status varchar(50) NOT NULL DEFAULT 'DRAFT',
        created_by uuid REFERENCES users(user_id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory_document_items (
        item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id uuid NOT NULL REFERENCES pc_inventory_documents(document_id) ON DELETE CASCADE,
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id),
        quantity numeric(12,6) NOT NULL,
        unit_cost numeric(12,6) NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory_ledger (
        ledger_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        location_id uuid REFERENCES warehouse_locations(id),
        document_id uuid REFERENCES pc_inventory_documents(document_id),
        quantity_delta numeric(12,6) NOT NULL,
        unit_cost numeric(12,6) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_equivalences (
        equivalence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id uuid NOT NULL REFERENCES pc_products(product_id) ON DELETE CASCADE,
        from_unit_id uuid NOT NULL REFERENCES pc_units(unit_id) ON DELETE RESTRICT,
        to_unit_id uuid NOT NULL REFERENCES pc_units(unit_id) ON DELETE RESTRICT,
        factor numeric(12,2) NOT NULL,
        CONSTRAINT uq_pc_equivalences_product_from_to UNIQUE (product_id, from_unit_id, to_unit_id)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_equivalences_product_id ON pc_equivalences(product_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_inventory_sku_warehouse ON pc_inventory(sku_id, warehouse_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_inventory_ledger_sku_created ON pc_inventory_ledger(sku_id, created_at DESC);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
```

- [ ] **Step 2: Register migration**

In `src/infrastructure/database/typeorm.config.ts`, import and add:

```ts
import { CreateProductCatalogCore20260618000000 } from "./migrations/20260618000000-create-product-catalog-core";
```

```ts
    CreateProductCatalogCore20260618000000,
```

Place it before migrations that depend on inventory/product catalog tables.

- [ ] **Step 3: Remove schema creation from equivalence seeder**

In `src/modules/product-catalog/infrastructure/seed/equivalence.seeder.ts`, delete `ensureEquivalencesTable` and replace:

```ts
  await ensureEquivalencesTable(dataSource);
```

with:

```ts
  await dataSource.query(`SELECT 1 FROM pc_equivalences LIMIT 1`);
```

This keeps seed failure explicit if migrations were not run.

- [ ] **Step 4: Run tests**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0 after all missing table strings for product catalog are covered.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/database/migrations/20260618000000-create-product-catalog-core.ts src/infrastructure/database/typeorm.config.ts src/modules/product-catalog/infrastructure/seed/equivalence.seeder.ts
git commit -m "feat: migrate product catalog schema"
```

---

### Task 4: Port Security Audit Tables

**Files:**
- Create: `src/infrastructure/database/migrations/20260618100000-create-security-audit-core.ts`
- Modify: `src/infrastructure/database/typeorm.config.ts`

**Interfaces:**
- Produces: `CreateSecurityAuditCore20260618100000`.

- [ ] **Step 1: Create security migration**

Create `src/infrastructure/database/migrations/20260618100000-create-security-audit-core.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSecurityAuditCore20260618100000 implements MigrationInterface {
  name = "CreateSecurityAuditCore20260618100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_reason_catalog (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        key varchar(120) NOT NULL UNIQUE,
        label varchar(180) NOT NULL,
        description text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_ip_violations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        ip varchar(80) NOT NULL,
        reason varchar(120) NOT NULL,
        path text,
        method varchar(20),
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_ip_bans (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        ip varchar(80) NOT NULL UNIQUE,
        ban_level int NOT NULL DEFAULT 1,
        banned_until timestamptz,
        manual_permanent_ban boolean NOT NULL DEFAULT false,
        notes text,
        created_by varchar(120),
        reviewed_by varchar(120),
        last_reason varchar(120),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_security_ip_violations_ip_created ON security_ip_violations(ip, created_at DESC);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_security_ip_violations_reason ON security_ip_violations(reason);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_security_ip_bans_ip_unique ON security_ip_bans(ip);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
```

- [ ] **Step 2: Register migration**

In `src/infrastructure/database/typeorm.config.ts`, import and add:

```ts
import { CreateSecurityAuditCore20260618100000 } from "./migrations/20260618100000-create-security-audit-core";
```

```ts
    CreateSecurityAuditCore20260618100000,
```

- [ ] **Step 3: Run verification**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0 after all security table strings are covered.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/database/migrations/20260618100000-create-security-audit-core.ts src/infrastructure/database/typeorm.config.ts
git commit -m "feat: migrate security audit schema"
```

---

### Task 5: Port Purchases Approval and History Tables

**Files:**
- Create: `src/infrastructure/database/migrations/20260506010000-create-purchase-approval-history.ts`
- Modify: `src/infrastructure/database/typeorm.config.ts`

**Interfaces:**
- Produces: `CreatePurchaseApprovalHistory20260506010000`.

- [ ] **Step 1: Create migration**

Create `src/infrastructure/database/migrations/20260506010000-create-purchase-approval-history.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseApprovalHistory20260506010000 implements MigrationInterface {
  name = "CreatePurchaseApprovalHistory20260506010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type varchar(80) NOT NULL,
        entity_id uuid NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'PENDING',
        requested_by uuid REFERENCES users(user_id),
        reviewed_by uuid REFERENCES users(user_id),
        reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_history_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL,
        event_type varchar(80) NOT NULL,
        description text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by uuid REFERENCES users(user_id),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_processing_approvals (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL,
        approval_request_id uuid REFERENCES approval_requests(id) ON DELETE SET NULL,
        status varchar(50) NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_history_events_purchase ON purchase_history_events(purchase_id, created_at);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
```

- [ ] **Step 2: Register migration**

In `src/infrastructure/database/typeorm.config.ts`, import and add:

```ts
import { CreatePurchaseApprovalHistory20260506010000 } from "./migrations/20260506010000-create-purchase-approval-history";
```

```ts
    CreatePurchaseApprovalHistory20260506010000,
```

Place it before purchase feature migrations that assume those tables.

- [ ] **Step 3: Run verification**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0 after purchase table strings are covered.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/database/migrations/20260506010000-create-purchase-approval-history.ts src/infrastructure/database/typeorm.config.ts
git commit -m "feat: migrate purchase approval history schema"
```

---

### Task 6: Port Mail SQL Migrations

**Files:**
- Create: `src/infrastructure/database/migrations/20260512090000-create-mail-center-foundation.ts`
- Create: `src/infrastructure/database/migrations/20260512103000-create-message-message-labels.ts`
- Create: `src/infrastructure/database/migrations/20260515113000-align-mail-model.ts`
- Create: `src/infrastructure/database/migrations/20260516093000-create-notification-module-label-configs.ts`
- Create: `src/infrastructure/database/migrations/20260520113000-create-mail-message-actions.ts`
- Create: `src/infrastructure/database/migrations/20260522183000-create-mail-storage-quotas.ts`
- Modify: `src/infrastructure/database/typeorm.config.ts`

**Interfaces:**
- Produces registered TypeORM migration classes for mail tables currently represented by module-local SQL.

- [ ] **Step 1: Port each module SQL file exactly**

For each source file, create a TypeORM migration class where `up()` executes the SQL body with `await queryRunner.query(\`...\`)`.

Source to target map:

```text
src/modules/mail/infrastructure/migrations/20260512090000-mail-center-foundation.sql
  -> src/infrastructure/database/migrations/20260512090000-create-mail-center-foundation.ts

src/modules/mail/infrastructure/migrations/20260512103000-create-message-message-labels.sql
  -> src/infrastructure/database/migrations/20260512103000-create-message-message-labels.ts

src/modules/mail/infrastructure/migrations/20260515113000-mail-model-alignment.sql
  -> src/infrastructure/database/migrations/20260515113000-align-mail-model.ts

src/modules/mail/infrastructure/migrations/20260516093000-create-notification-module-label-configs.sql
  -> src/infrastructure/database/migrations/20260516093000-create-notification-module-label-configs.ts

src/modules/mail/infrastructure/migrations/20260520113000-create-mail-message-actions.sql
  -> src/infrastructure/database/migrations/20260520113000-create-mail-message-actions.ts

src/modules/mail/infrastructure/migrations/20260522183000-add-mail-storage-quotas.sql
  -> src/infrastructure/database/migrations/20260522183000-create-mail-storage-quotas.ts
```

Use this class shape for every file:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMailCenterFoundation20260512090000 implements MigrationInterface {
  name = "CreateMailCenterFoundation20260512090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- paste the exact SQL body here
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
```

Use matching class names:

```text
CreateMailCenterFoundation20260512090000
CreateMessageMessageLabels20260512103000
AlignMailModel20260515113000
CreateNotificationModuleLabelConfigs20260516093000
CreateMailMessageActions20260520113000
CreateMailStorageQuotas20260522183000
```

- [ ] **Step 2: Register all mail migrations**

Import and add the six classes to `src/infrastructure/database/typeorm.config.ts` in timestamp order.

- [ ] **Step 3: Confirm orphaned mail SQL is no longer the only source**

Run:

```bash
rg -n "message_labels|mail_message_actions|mail_storage_quotas|notification_module_label_configs" src/infrastructure/database/migrations
```

Expected: matches in the new registered TypeORM migration files.

- [ ] **Step 4: Run verification**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0 after mail table strings are covered.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/database/migrations/20260512090000-create-mail-center-foundation.ts src/infrastructure/database/migrations/20260512103000-create-message-message-labels.ts src/infrastructure/database/migrations/20260515113000-align-mail-model.ts src/infrastructure/database/migrations/20260516093000-create-notification-module-label-configs.ts src/infrastructure/database/migrations/20260520113000-create-mail-message-actions.ts src/infrastructure/database/migrations/20260522183000-create-mail-storage-quotas.ts src/infrastructure/database/typeorm.config.ts
git commit -m "feat: migrate mail schema from module sql"
```

---

### Task 7: Create Production Item Migration

**Files:**
- Create: `src/infrastructure/database/migrations/20260618110000-create-production-core.ts`
- Modify: `src/infrastructure/database/typeorm.config.ts`

**Interfaces:**
- Produces: `CreateProductionCore20260618110000`.

- [ ] **Step 1: Create migration**

Create `src/infrastructure/database/migrations/20260618110000-create-production-core.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductionCore20260618110000 implements MigrationInterface {
  name = "CreateProductionCore20260618110000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_order_items (
        item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        production_id uuid NOT NULL REFERENCES production_orders(production_id) ON DELETE CASCADE,
        finished_item_id uuid NOT NULL REFERENCES pc_skus(sku_id),
        from_location_id uuid REFERENCES warehouse_locations(id),
        to_location_id uuid REFERENCES warehouse_locations(id),
        quantity int NOT NULL,
        waste_qty numeric(12,6) NOT NULL DEFAULT 0,
        unit_cost numeric NOT NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_production_items_production ON production_order_items(production_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_production_items_finished_item ON production_order_items(finished_item_id);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
```

- [ ] **Step 2: Register migration**

In `src/infrastructure/database/typeorm.config.ts`, import and add:

```ts
import { CreateProductionCore20260618110000 } from "./migrations/20260618110000-create-production-core";
```

```ts
    CreateProductionCore20260618110000,
```

Place it after foundation/product catalog and before `CreateProductionHistoryEvents20260621000000`.

- [ ] **Step 3: Run verification**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0 after production item table string is covered.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/database/migrations/20260618110000-create-production-core.ts src/infrastructure/database/typeorm.config.ts
git commit -m "feat: migrate production core schema"
```

---

### Task 8: Replace `clear.ts` Synchronization Reset

**Files:**
- Modify: `clear.ts`

**Interfaces:**
- Produces: a reset script that drops schema state but does not recreate app tables through TypeORM synchronization.

- [ ] **Step 1: Replace DataSource options**

In `clear.ts`, replace:

```ts
  dropSchema: true,
  synchronize: true,
  logging: false,
  entities,
```

with:

```ts
  synchronize: false,
  logging: false,
  entities: [],
```

- [ ] **Step 2: Replace initialize callback**

Replace the `.then(async () => { ... })` body with:

```ts
  .then(async () => {
    await dataSource.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await dataSource.query(`CREATE SCHEMA public`);
    await dataSource.query(`GRANT ALL ON SCHEMA public TO public`);
    console.log('[Clear] Se elimino el esquema public y el historial de migraciones.');
    console.log('[Clear] Ejecuta pnpm run migrate para reconstruir el esquema desde migraciones.');
    await dataSource.destroy();
  })
```

- [ ] **Step 3: Remove unused imports**

After changing `entities: []`, remove all entity imports and the `entities` array from `clear.ts`. Keep only:

```ts
import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';
```

- [ ] **Step 4: Run build**

```bash
pnpm run build
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add clear.ts
git commit -m "chore: make clear reset migration-only"
```

---

### Task 9: Run Clean Database Migration Drill

**Files:**
- No source edits.

**Interfaces:**
- Consumes: configured `.env` database.
- Produces: evidence that production schema can be rebuilt from migrations only.

- [ ] **Step 1: Confirm target database is disposable**

Run:

```bash
Get-Content -Raw .env
```

Confirm `DB_NAME`, host, and port point to a local or staging disposable database, not production.

- [ ] **Step 2: Reset database**

Run:

```bash
pnpm run clear
```

Expected output:

```text
[Clear] Se elimino el esquema public y el historial de migraciones.
[Clear] Ejecuta pnpm run migrate para reconstruir el esquema desde migraciones.
```

- [ ] **Step 3: Run migrations**

Run:

```bash
pnpm run migrate
```

Expected: command exits 0 and prints executed migrations, or `No hay migraciones pendientes.` only after a second run.

- [ ] **Step 4: Verify migration idempotency**

Run again:

```bash
pnpm run migrate
```

Expected:

```text
No hay migraciones pendientes.
```

- [ ] **Step 5: Run seed**

Run:

```bash
pnpm run seed
```

Expected:

```text
Seeding completo!
```

- [ ] **Step 6: Run backend checks**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0.

- [ ] **Step 7: Commit evidence if docs are updated**

If adding drill notes, commit:

```bash
git add docs/superpowers/plans/2026-07-15-production-migrations-readiness.md
git commit -m "docs: record production migration drill"
```

---

### Task 10: Production Readiness Gate

**Files:**
- Optional modify: `src/infrastructure/database/eunoia.sql`
- Optional create: `docs/production-migration-runbook.md`

**Interfaces:**
- Produces: final deployment checklist for production migration execution.

- [ ] **Step 1: Add legacy warning to `eunoia.sql`**

At the top of `src/infrastructure/database/eunoia.sql`, add:

```sql
-- LEGACY REFERENCE ONLY.
-- Production schema must be created with pnpm run migrate.
-- Do not apply this file directly to production.
```

- [ ] **Step 2: Create production runbook**

Create `docs/production-migration-runbook.md`:

```md
# Production Migration Runbook

## Preconditions

- Backend build passed with `pnpm run build`.
- Migration config tests passed with `pnpm test -- typeorm.config.spec.ts --runInBand`.
- Staging clean-database drill passed: `pnpm run clear`, `pnpm run migrate`, second `pnpm run migrate`, and `pnpm run seed`.
- Production `.env` has `NODE_ENV=production`.
- Production database backup was created and restore was tested.

## Deployment Steps

1. Stop application writes.
2. Create database backup.
3. Deploy backend artifact.
4. Run `pnpm run migrate`.
5. Start application.
6. Check health endpoint.
7. Check login, users, catalog, purchases, sales, production, mail, security dashboard.

## Rollback

1. Stop application.
2. Restore database backup if migration caused data or schema corruption.
3. Redeploy previous backend artifact.
4. Start application.
5. Verify login and core list endpoints.
```

- [ ] **Step 3: Run final verification**

```bash
pnpm test -- typeorm.config.spec.ts --runInBand
pnpm run build
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/database/eunoia.sql docs/production-migration-runbook.md
git commit -m "docs: add production migration runbook"
```

---

## Final Acceptance Checklist

- [ ] `clear.ts` does not use `synchronize: true`.
- [ ] `getTypeOrmModuleOptions().synchronize` is false when `NODE_ENV=production`.
- [ ] Every `src/infrastructure/database/migrations/*.ts` migration class is registered in `typeorm.config.ts`.
- [ ] No runtime entity table depends only on `eunoia.sql`.
- [ ] No runtime entity table depends only on `src/modules/**/infrastructure/migrations/*.sql`.
- [ ] No seeder creates schema tables as a hidden side effect.
- [ ] `pnpm run clear` exits 0 on a disposable database.
- [ ] `pnpm run migrate` exits 0 immediately after `clear`.
- [ ] A second `pnpm run migrate` prints `No hay migraciones pendientes.`
- [ ] `pnpm run seed` exits 0 after migration.
- [ ] `pnpm test -- typeorm.config.spec.ts --runInBand` exits 0.
- [ ] `pnpm run build` exits 0.
- [ ] Frontend production environment does not point `VITE_API_BASE_URL` to `http://localhost:3000/api`.
- [ ] Frontend `pnpm run build` exits 0.

## Self-Review Notes

- Spec coverage: The plan covers migration registration, missing entity tables, orphan SQL migrations, `clear.ts`, clean-database drill, backend build, frontend env, and production runbook.
- Placeholder scan: No `TBD` or deferred implementation markers are used.
- Type consistency: Migration class names match import names listed in tasks.

