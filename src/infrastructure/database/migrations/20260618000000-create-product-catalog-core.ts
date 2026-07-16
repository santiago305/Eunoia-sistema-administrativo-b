import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductCatalogCore20260618000000 implements MigrationInterface {
  name = "CreateProductCatalogCore20260618000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_recipes (
        recipe_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        version integer NOT NULL DEFAULT 1,
        yield_quantity numeric(12,3) NOT NULL,
        notes text NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_recipes_sku ON pc_recipes(sku_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_recipe_items (
        recipe_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipe_id uuid NOT NULL REFERENCES pc_recipes(recipe_id) ON DELETE CASCADE,
        material_sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE RESTRICT,
        quantity numeric(12,3) NOT NULL,
        unit_id uuid NOT NULL REFERENCES pc_units(unit_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_catalog_publications (
        publication_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_code varchar(80) NOT NULL,
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        is_visible boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        price_override numeric(12,2) NULL,
        display_name_override varchar(255) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ux_pc_catalog_publications_channel_sku UNIQUE (channel_code, sku_id)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_catalog_publications_channel ON pc_catalog_publications(channel_code);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory (
        warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        stock_item_id uuid NOT NULL REFERENCES pc_stock_items(stock_item_id) ON DELETE CASCADE,
        location_id uuid NULL REFERENCES warehouse_locations(id) ON DELETE SET NULL,
        on_hand integer NOT NULL DEFAULT 0,
        reserved integer NOT NULL DEFAULT 0,
        available integer NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_pc_inventory PRIMARY KEY (warehouse_id, stock_item_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory_documents (
        doc_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        doc_type inv_doc_type NOT NULL,
        product_type pc_product_type NULL,
        status inv_doc_status NOT NULL DEFAULT 'DRAFT',
        serie_id uuid NULL REFERENCES document_series(serie_id),
        correlative integer NULL,
        from_warehouse_id uuid NULL REFERENCES warehouses(id),
        to_warehouse_id uuid NULL REFERENCES warehouses(id),
        reference_id uuid NULL,
        reference_type varchar NULL,
        note text NULL,
        created_by uuid NULL REFERENCES users(user_id),
        posted_by uuid NULL REFERENCES users(user_id),
        posted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory_document_items (
        item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        doc_id uuid NOT NULL REFERENCES pc_inventory_documents(doc_id) ON DELETE CASCADE,
        stock_item_id uuid NOT NULL REFERENCES pc_stock_items(stock_item_id),
        from_location_id uuid NULL REFERENCES warehouse_locations(id),
        to_location_id uuid NULL REFERENCES warehouse_locations(id),
        quantity integer NOT NULL,
        waste_qty numeric(12,6) NOT NULL DEFAULT 0,
        unit_cost numeric(12,2) NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_inv_doc_items_doc ON pc_inventory_document_items(doc_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_inv_doc_items_stock_item ON pc_inventory_document_items(stock_item_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_inventory_ledger (
        ledger_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        doc_id uuid NOT NULL REFERENCES pc_inventory_documents(doc_id),
        doc_item_id uuid NULL REFERENCES pc_inventory_document_items(item_id),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        location_id uuid NULL REFERENCES warehouse_locations(id),
        stock_item_id uuid NOT NULL REFERENCES pc_stock_items(stock_item_id),
        direction inv_direction NOT NULL,
        quantity integer NOT NULL,
        waste_qty numeric(12,6) NOT NULL DEFAULT 0,
        unit_cost numeric(12,2) NULL,
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_inventory_stock_item_warehouse ON pc_inventory(stock_item_id, warehouse_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pc_inventory_ledger_stock_item_created ON pc_inventory_ledger(stock_item_id, created_at DESC);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
