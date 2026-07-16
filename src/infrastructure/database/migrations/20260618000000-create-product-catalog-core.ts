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
