import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductEntity } from '../entities/product.entity';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { UnitEntity } from '../entities/unit.entity';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/shared/value-objets/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';
import { AttributesRecord } from 'src/modules/catalog/domain/value-object/variant-attributes.vo';
import { RowMaterial } from 'src/modules/catalog/domain/read-models/row-materials';
import { ProductWithUnitInfo } from 'src/modules/catalog/domain/read-models/product-with-unit-info.rm';
import { ProductRepository } from 'src/modules/catalog/application/ports/product.repository';
import { ProductFactory } from 'src/modules/catalog/domain/factories/product.factory';
import { ProductVariantFactory } from 'src/modules/catalog/domain/factories/product-variant.factory';
import { FlatProductOutput } from 'src/modules/catalog/application/dto/products/output/flat-product-out';

@Injectable()
export class ProductTypeormRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductEntity);
  }

  private getVariantRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductVariantEntity);
  }

  async create(prod: Product, tx?: TransactionContext): Promise<Product> {
    const repo = this.getRepo(tx);
    const saved = await repo.save({
      baseUnitId: prod.getBaseUnitId(),
      name: prod.getName(),
      description: prod.getDescription(),
      sku: prod.getSku(),
      customSku: prod.getCustomSku() ?? null,
      barcode: prod.getBarcode(),
      price: prod.getPrice().getAmount(),
      cost: prod.getCost().getAmount(),
      attributes: prod.getAttributes(), 
      type: prod.getType(),
      isActive: prod.getIsActive() ?? true,
    });
    return this.toDomain(saved);
  }

  async findById(id: ProductId, tx?: TransactionContext): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({ where: { id: id.value } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByIdWithUnitInfo(id: ProductId, tx?: TransactionContext): Promise<ProductWithUnitInfo | null> {
    const repo = this.getRepo(tx);
    const qb = repo
      .createQueryBuilder('p')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id')
      .where('p.id = :id', { id: id.value });

    const { entities, raw } = await qb
      .select([
        'p.id',
        'p.baseUnitId',
        'p.name',
        'p.description',
        'p.sku',
        'p.customSku',
        'p.barcode',
        'p.price',
        'p.cost',
        'p.attributes',
        'p.isActive',
        'p.type',
        'p.createdAt',
        'p.updatedAt',
        'u.code',
        'u.name',
      ])
      .getRawAndEntities();

    const row = entities[0];
    if (!row) return null;

    const r = raw[0];
    const product = ProductFactory.create({
      id: ProductId.create(row.id),
      baseUnitId: row.baseUnitId,
      name: row.name,
      description: row.description,
      sku: row.sku,
      barcode: row.barcode,
      price: Money.create(Number(row.price)),
      cost: Money.create(Number(row.cost ?? 0)),
      attributes: row.attributes,
      isActive: row.isActive,
      type: row.type,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customSku: row.customSku,
    });

    return {
      product,
      baseUnitName: r.u_name,
      baseUnitCode: r.u_code,
    };
  }

  async findByName(name: string, tx?: TransactionContext): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const row = await repo
      .createQueryBuilder('p')
      .where('LOWER(p.name) = LOWER(:name)', { name: name.trim() })
      .orderBy('p.created_at', 'DESC')
      .getOne();
    if (!row) return null;
    return this.toDomain(row);
  }

  async searchPaginated(
    params: {
      isActive?: boolean;
      name?: string;
      description?: string;
      type?: ProductType;
      page: number;
      q?: string;
      limit: number;
      sku?: string;
      barcode?: string;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Array<{ product: Product; baseUnitName?: string; baseUnitCode?: string }>; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo
      .createQueryBuilder('p')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id');

    const name = params.name?.trim();
    const description = params.description?.trim();
    const sku = params.sku?.trim();
    const barcode = params.barcode?.trim();
    const search = params.q?.trim();

    if (name) {
      qb.andWhere('LOWER(p.name) LIKE :name', { name: `%${name.toLowerCase()}%` });
    }

    if (description) {
      qb.andWhere('LOWER(p.description) LIKE :description', {
        description: `%${description.toLowerCase()}%`,
      });
    }

    if (params.type) {
      qb.andWhere('p.type = :type', { type: params.type });
    }

    if (sku) {
      qb.andWhere('LOWER(p.sku) LIKE :sku', { sku: `%${sku.toLowerCase()}%` });
    }

    if (barcode) {
      qb.andWhere('LOWER(p.barcode) LIKE :barcode', {
        barcode: `%${barcode.toLowerCase()}%`,
      });
    }

    if (params.isActive !== undefined) {
      qb.andWhere('p.is_active = :isActive', { isActive: params.isActive });
    }

    if (search) {
      const q = `%${search.toLowerCase()}%`;

      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('LOWER(p.sku) LIKE :q', { q })
            .orWhere('LOWER(p.barcode) LIKE :q', { q })
            .orWhere('LOWER(p.name) LIKE :q', { q })
            .orWhere('LOWER(p.description) LIKE :q', { q })
            .orWhere('LOWER(p.custom_sku) LIKE :q', { q })
            .orWhere(`LOWER(p.attributes->>'presentation') LIKE :q`, { q })
            .orWhere(`LOWER(p.attributes->>'variant') LIKE :q`, { q })
            .orWhere(`LOWER(p.attributes->>'color') LIKE :q`, { q });
        }),
      );
    }

    const skip = (params.page - 1) * params.limit;
    const total = await qb.clone().getCount();

    const { entities, raw } = await qb
      .select([
        'p.id',
        'p.baseUnitId',
        'p.name',
        'p.description',
        'p.sku',
        'p.customSku',
        'p.barcode',
        'p.price',
        'p.cost',
        'p.attributes',
        'p.isActive',
        'p.type',
        'p.createdAt',
        'p.updatedAt',
        'u.code',
        'u.name',
      ])
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(params.limit)
      .getRawAndEntities();

    const items = entities.map((row, idx) => {
      const r = raw[idx];
      const product = ProductFactory.create({
        id: ProductId.create(row.id),
        baseUnitId: row.baseUnitId,
        name: row.name,
        description: row.description,
        sku: row.sku,
        barcode: row.barcode,
        price: Money.create(Number(row.price)),
        cost: Money.create(Number(row.cost ?? 0)),
        attributes: row.attributes,
        isActive: row.isActive,
        type: row.type,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        customSku: row.customSku,
      });

      return {
        product,
        baseUnitName: r.u_name,
        baseUnitCode: r.u_code,
      };
    });

    return { items, total };
  }

  async searchFlatPaginated(
    params: {
      isActive?: boolean;
      name?: string;
      description?: string;
      type?: ProductType;
      page: number;
      q?: string;
      limit: number;
      sku?: string;
      barcode?: string;
    },
    tx?: TransactionContext,
  ): Promise<{ items: FlatProductOutput[]; total: number }> {
    const manager = this.getManager(tx);
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const offset = (page - 1) * limit;

    const name = params.name?.trim();
    const description = params.description?.trim();
    const sku = params.sku?.trim();
    const barcode = params.barcode?.trim();
    const search = params.q?.trim();

    const productWhere: string[] = [];
    const variantWhere: string[] = [];
    const values: Array<string | number | boolean> = [];

    const pushParam = (value: string | number | boolean) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (name) {
      const param = pushParam(`%${name.toLowerCase()}%`);
      productWhere.push(`LOWER(p.name) LIKE ${param}`);
      variantWhere.push(`LOWER(p.name) LIKE ${param}`);
    }

    if (description) {
      const param = pushParam(`%${description.toLowerCase()}%`);
      productWhere.push(`LOWER(COALESCE(p.description, '')) LIKE ${param}`);
      variantWhere.push(`LOWER(COALESCE(p.description, '')) LIKE ${param}`);
    }

    if (params.type) {
      const param = pushParam(params.type);
      productWhere.push(`p.type = ${param}`);
      variantWhere.push(`p.type = ${param}`);
    }

    if (sku) {
      const param = pushParam(`%${sku.toLowerCase()}%`);
      productWhere.push(`LOWER(p.sku) LIKE ${param}`);
      variantWhere.push(`LOWER(v.sku) LIKE ${param}`);
    }

    if (barcode) {
      const param = pushParam(`%${barcode.toLowerCase()}%`);
      productWhere.push(`LOWER(COALESCE(p.barcode, '')) LIKE ${param}`);
      variantWhere.push(`LOWER(COALESCE(v.barcode, '')) LIKE ${param}`);
    }

    if (params.isActive !== undefined) {
      const param = pushParam(params.isActive);
      productWhere.push(`p.is_active = ${param}`);
      variantWhere.push(`v.is_active = ${param}`);
    }

    if (search) {
      const param = pushParam(`%${search.toLowerCase()}%`);
      productWhere.push(`(
        LOWER(p.sku) LIKE ${param}
        OR LOWER(COALESCE(p.barcode, '')) LIKE ${param}
        OR LOWER(p.name) LIKE ${param}
        OR LOWER(COALESCE(p.description, '')) LIKE ${param}
        OR LOWER(COALESCE(p.custom_sku, '')) LIKE ${param}
        OR LOWER(COALESCE(p.attributes->>'presentation', '')) LIKE ${param}
        OR LOWER(COALESCE(p.attributes->>'variant', '')) LIKE ${param}
        OR LOWER(COALESCE(p.attributes->>'color', '')) LIKE ${param}
      )`);
      variantWhere.push(`(
        LOWER(v.sku) LIKE ${param}
        OR LOWER(COALESCE(v.barcode, '')) LIKE ${param}
        OR LOWER(COALESCE(v.custom_sku, '')) LIKE ${param}
        OR LOWER(p.name) LIKE ${param}
        OR LOWER(COALESCE(p.description, '')) LIKE ${param}
        OR LOWER(COALESCE(v.attributes->>'presentation', '')) LIKE ${param}
        OR LOWER(COALESCE(v.attributes->>'variant', '')) LIKE ${param}
        OR LOWER(COALESCE(v.attributes->>'color', '')) LIKE ${param}
      )`);
    }

    const productWhereSql = productWhere.length ? `WHERE ${productWhere.join(' AND ')}` : '';
    const variantWhereSql = variantWhere.length ? `WHERE ${variantWhere.join(' AND ')}` : '';

    const unionSql = `
      SELECT
        p.product_id AS id,
        'PRODUCT'::text AS "sourceType",
        p.product_id AS "productId",
        p.created_at AS "parentCreatedAt",
        p.base_unit_id AS "baseUnitId",
        p.name AS name,
        p.description AS description,
        p.sku AS sku,
        p.custom_sku AS "customSku",
        p.barcode AS barcode,
        p.price::numeric AS price,
        p.cost::numeric AS cost,
        p.attributes AS attributes,
        u.name AS "baseUnitName",
        u.code AS "baseUnitCode",
        p.is_active AS "isActive",
        p.type AS type,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM products p
      INNER JOIN units u ON u.unit_id = p.base_unit_id
      ${productWhereSql}

      UNION ALL

      SELECT
        v.variant_id AS id,
        'VARIANT'::text AS "sourceType",
        p.product_id AS "productId",
        p.created_at AS "parentCreatedAt",
        p.base_unit_id AS "baseUnitId",
        p.name AS name,
        p.description AS description,
        v.sku AS sku,
        v.custom_sku AS "customSku",
        v.barcode AS barcode,
        v.price::numeric AS price,
        COALESCE(v.cost, 0)::numeric AS cost,
        v.attributes AS attributes,
        u.name AS "baseUnitName",
        u.code AS "baseUnitCode",
        v.is_active AS "isActive",
        p.type AS type,
        v.created_at AS "createdAt",
        NULL::timestamp AS "updatedAt"
      FROM product_variants v
      INNER JOIN products p ON p.product_id = v.product_id
      INNER JOIN units u ON u.unit_id = p.base_unit_id
      ${variantWhereSql}
    `;

    const totalRows = await manager.query(
      `SELECT COUNT(*)::int AS total FROM (${unionSql}) flat_catalog`,
      values,
    );

    const paginationValues = [...values];
    const limitParam = `$${paginationValues.push(limit)}`;
    const offsetParam = `$${paginationValues.push(offset)}`;

    const rows = await manager.query(
      `
        SELECT *
        FROM (${unionSql}) flat_catalog
        ORDER BY "parentCreatedAt" DESC, "productId" DESC, CASE WHEN "sourceType" = 'PRODUCT' THEN 0 ELSE 1 END ASC, "createdAt" ASC, id ASC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      paginationValues,
    );

    return {
      items: rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        sourceType: row.sourceType as "PRODUCT" | "VARIANT",
        productId: String(row.productId),
        baseUnitId: String(row.baseUnitId),
        name: String(row.name),
        description: row.description ? String(row.description) : null,
        sku: String(row.sku),
        customSku: row.customSku ? String(row.customSku) : null,
        barcode: row.barcode ? String(row.barcode) : null,
        price: Number(row.price),
        cost: Number(row.cost ?? 0),
        attributes: (row.attributes as Record<string, unknown>) ?? {},
        baseUnitName: String(row.baseUnitName),
        baseUnitCode: String(row.baseUnitCode),
        isActive: Boolean(row.isActive),
        type: row.type as ProductType,
        createdAt: new Date(String(row.createdAt)),
        updatedAt: row.updatedAt ? new Date(String(row.updatedAt)) : null,
      })),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async getByIdWithVariants(
    id: ProductId,
    tx?: TransactionContext,
  ): Promise<{ product: Product; items: ProductVariant[] } | null> {
    const product = await this.findById(id, tx);
    if (!product) return null;
    const items = await this.listVariants(id, tx);
    return { product, items };
  }

  async update(
    params: {
      id: ProductId;
      name?: string;
      description?: string | null;
      baseUnitId?: string;
      sku?: string;
      barcode?: string | null;
      customSku?: string | null;
      price?: Money;
      cost?: Money;
      attributes?: AttributesRecord;
      type?: ProductType;
    },
    tx?: TransactionContext,
  ): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<ProductEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.description !== undefined) patch.description = params.description;
    if (params.baseUnitId !== undefined) patch.baseUnitId = params.baseUnitId;
    if (params.sku !== undefined) patch.sku = params.sku;
    if (params.barcode !== undefined) patch.barcode = params.barcode;
    if (params.customSku !== undefined) patch.customSku = params.customSku;
    if (params.price !== undefined) patch.price = params.price.getAmount();
    if (params.cost !== undefined) patch.cost = params.cost.getAmount();
    if (params.attributes !== undefined) patch.attributes = params.attributes;
    if (params.type !== undefined) patch.type = params.type;

    await repo.update({ id: params.id.value }, patch);
    const updated = await repo.findOne({ where: { id: params.id.value } });
    if (!updated) return null;
    return this.toDomain(updated);
  }

  async setActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: id.value }, { isActive });
  }

  async findBySku(sku: string, tx?: TransactionContext): Promise<Product | null> {
    const row = await this.getRepo(tx).findOne({ where: { sku } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByBarcode(barcode: string, tx?: TransactionContext): Promise<Product | null> {
    const row = await this.getRepo(tx).findOne({ where: { barcode } });
    if (!row) return null;
    return this.toDomain(row);
  }
    async findLastCreated(tx?: TransactionContext): Promise<Product | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder('v')
      .orderBy('v.created_at', 'DESC')
      .limit(1)
      .getOne();
    if (!row) return null;
     return this.toDomain(row);
  }

  async setAllVariantsActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getVariantRepo(tx).update({ productId: id.value }, { isActive });
  }

  async listVariants(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getVariantRepo(tx).find({ where: { productId: productId.value } });
    return rows.map((r) =>
      ProductVariantFactory.create({
        id: r.id,
        productId: ProductId.create(productId.value),
        sku: r.sku,
        barcode: r.barcode,
        attributes: r.attributes,
        price: Money.create(Number(r.price)),
        cost: Money.create(Number(r.cost ?? 0)),
        isActive: r.isActive,
        createdAt: r.createdAt,
        customSku: r.customSku,
      }),
    );
  }

  async countAll(tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).count();
  }

  async countByActive(isActive: boolean, tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).count({ where: { isActive } });
  }

  async countCreatedSince(from: Date, tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).createQueryBuilder('p').where('p.created_at >= :from', { from }).getCount();
  }

  async countUpdatedSince(from: Date, tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).createQueryBuilder('p').where('p.updated_at >= :from', { from }).getCount();
  }

  async createdByMonthSince(from: Date, tx?: TransactionContext): Promise<Array<{ month: string; count: number }>> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder('p')
      .select(`to_char(date_trunc('month', p.created_at), 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)::int', 'count')
      .where('p.created_at >= :from', { from })
      .groupBy(`date_trunc('month', p.created_at)`)
      .orderBy(`date_trunc('month', p.created_at)`, 'ASC')
      .getRawMany<{ month: string; count: string }>();

    return rows.map((r) => ({ month: r.month, count: Number(r.count) }));
  }

  async latest(limit: number, tx?: TransactionContext): Promise<Array<{ id: string; name: string; isActive: boolean; createdAt: Date }>> {
    const rows = await this.getRepo(tx).find({
      select: { id: true, name: true, isActive: true, createdAt: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.isActive, createdAt: r.createdAt }));
  }
  
  async listRowMaterialProduct(row: boolean = true, tx?: TransactionContext): Promise<RowMaterial[]> {
    const qb = this.getManager(tx)
      .getRepository(ProductEntity)
      .createQueryBuilder("p")
      .leftJoin(UnitEntity, "u", "u.unit_id = p.base_unit_id");

    if (row) {
      qb.where("p.type = :type", { type: ProductType.PRIMA });
    } else {
      qb.where("p.type = :type", { type: ProductType.FINISHED });
    }

      const raw = await qb
        .select([
          "p.id",
          "p.name",
          "p.description",
          "p.baseUnitId",
          "p.sku",
          "p.customSku",
          "p.attributes",
          "u.code",
          "u.name",
        ])
        .getRawMany();

    return raw.map((r) => ({
      primaId: r.p_product_id,
      productName: r.p_name,
      productDescription: r.p_description,
      sku: r.p_sku,
      baseUnitId: r.p_base_unit_id,
      unitCode: r.u_code,
      unitName: r.u_name,
      type:'PRODUCT',
      attributes: r.p_attributes,
      customSku:r.p_custom_sku
    }));
    }

  async searchRowMaterialProduct(
    params: { q: string; raw?: boolean; withRecipes?: boolean },
    tx?: TransactionContext,
  ): Promise<RowMaterial[]> {
    const search = params.q?.trim();
    if (!search) return [];

    const q = `%${search.toLowerCase()}%`;
    const raw = params.raw ?? true;

    const qb = this.getManager(tx)
      .getRepository(ProductEntity)
      .createQueryBuilder('p')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id');

    if (params.withRecipes) {
      qb.innerJoin('product_recipes', 'r', 'r.finished_variant_id = p.product_id').distinct(true);
    }

    qb.where('p.type = :type', { type: raw ? ProductType.PRIMA : ProductType.FINISHED });

    qb.andWhere(
      new Brackets((qb1) => {
        qb1
          .where('LOWER(p.sku) LIKE :q', { q })
          .orWhere('LOWER(p.barcode) LIKE :q', { q })
          .orWhere('LOWER(p.name) LIKE :q', { q })
          .orWhere('LOWER(p.description) LIKE :q', { q })
          .orWhere('LOWER(p.custom_sku) LIKE :q', { q })
          .orWhere(`LOWER(p.attributes->>'presentation') LIKE :q`, { q })
          .orWhere(`LOWER(p.attributes->>'variant') LIKE :q`, { q })
          .orWhere(`LOWER(p.attributes->>'color') LIKE :q`, { q });
      }),
    );

    const rows = await qb
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.baseUnitId',
        'p.sku',
        'p.customSku',
        'p.attributes',
        'p.createdAt',  
        'u.code',
        'u.name',
      ])
      .getRawMany();

    return rows.map((r) => ({
      primaId: r.p_product_id,
      productName: r.p_name,
      productDescription: r.p_description,
      sku: r.p_sku,
      baseUnitId: r.p_baseUnitId,
      unitCode: r.u_code,
      unitName: r.u_name,
      type: 'PRODUCT',
      attributes: r.p_attributes,
      customSku: r.p_custom_sku,
      createdAt: r.p_createdAt ?? r.p_created_at
    }));
  }

  async listFinishedWithRecipesProduct(tx?: TransactionContext): Promise<RowMaterial[]> {
    const qb = this.getManager(tx)
      .getRepository(ProductEntity)
      .createQueryBuilder('p')
      .innerJoin('product_recipes', 'r', 'r.finished_variant_id = p.product_id')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id')
      .where('p.type = :type', { type: ProductType.FINISHED })
      .distinct(true);

      const raw = await qb
        .select([
          'p.id',
          'p.name',
          'p.description',
          'p.baseUnitId',
          'p.sku',
          'p.customSku',
          'p.attributes',
          'u.code',
          'u.name',
        ])
        .getRawMany();

    return raw.map((r) => ({
      primaId: r.p_product_id,
      productName: r.p_name,
      productDescription: r.p_description,
      sku: r.p_sku,
      baseUnitId: r.p_baseUnitId,
      unitCode: r.u_code,
      unitName: r.u_name,
      type: 'PRODUCT',
      attributes: r.p_attributes,
      customSku:r.p_custom_sku
    }));
    }

  async listFinishedActive(tx?: TransactionContext): Promise<Product[]> {
    const rows = await this.getRepo(tx).find({
      where: { type: ProductType.FINISHED, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async listPrimaActive(tx?: TransactionContext): Promise<Product[]> {
    const rows = await this.getRepo(tx).find({
      where: { type: ProductType.PRIMA, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }


  private toDomain(row: ProductEntity): Product {
    return ProductFactory.create({
      id: ProductId.create(row.id),
      baseUnitId: row.baseUnitId,
      name: row.name,
      description: row.description,
      sku: row.sku,
      barcode: row.barcode,
      price: Money.create(Number(row.price)),
      cost: Money.create(Number(row.cost ?? 0)),
      attributes: row.attributes,
      isActive: row.isActive,
      type: row.type,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customSku: row.customSku,
    });
  }

}
