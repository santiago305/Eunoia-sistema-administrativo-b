import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { ProductEntity } from '../entities/product.entity';
import { UnitEntity } from '../entities/unit.entity';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductVariantWithProductInfo } from 'src/modules/catalog/domain/read-models/product-variant-with-product-info.rm';
import { AttributesRecord } from 'src/modules/catalog/domain/value-object/variant-attributes.vo';
import { RowMaterial } from 'src/modules/catalog/domain/read-models/row-materials';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

@Injectable()
export class ProductVariantTypeormRepository implements ProductVariantRepository {
  constructor(
    @InjectRepository(ProductVariantEntity)
    private readonly repo: Repository<ProductVariantEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductVariantEntity);
  }

  async create(variant: ProductVariant, tx?: TransactionContext): Promise<ProductVariant> {
    const repo = this.getRepo(tx);
    const saved = await repo.save({
      productId: variant.getProductId().value,
      sku: variant.getSku(),
      customSku: variant.getCustomSku() ?? null,
      barcode: variant.getBarcode(),
      attributes: variant.getAttributes(),
      price: variant.getPrice().getAmount(),
      cost: variant.getCost().getAmount(),
      isActive: variant.getIsActive() ?? true,
    });
    return this.toDomain(saved);
  }

  async search(
    params: {
      productId?: ProductId;
      isActive?: boolean;
      sku?: string;
      barcode?: string;
      q?: string;
      productName?: string;
      productDescription?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ProductVariantWithProductInfo[]; total: number }> {
    const repo = this.getRepo(tx);
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const qb = repo
      .createQueryBuilder('v')
      .innerJoin(ProductEntity, 'p', 'p.product_id = v.product_id')
      .innerJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id');

    const sku = params.sku?.trim();
    const barcode = params.barcode?.trim();
    const productName = params.productName?.trim();
    const productDescription = params.productDescription?.trim();
    const search = params.q?.trim();

    if (params.productId) {
      qb.andWhere('v.product_id = :productId', { productId: params.productId.value });
    }
    if (params.isActive !== undefined) {
      qb.andWhere('v.is_active = :isActive', { isActive: params.isActive });
    }
    if (sku) {
      qb.andWhere('LOWER(v.sku) LIKE :sku', { sku: `%${sku.toLowerCase()}%` });
    }
    if (barcode) {
      qb.andWhere('LOWER(v.barcode) LIKE :barcode', { barcode: `%${barcode.toLowerCase()}%` });
    }
    if (productName) {
      qb.andWhere('LOWER(p.name) LIKE :productName', {
        productName: `%${productName.toLowerCase()}%`,
      });
    }
    if (params.type) {
      qb.andWhere('p.type = :type', { type: params.type });
    }
    if (productDescription) {
      qb.andWhere('LOWER(p.description) LIKE :productDescription', {
        productDescription: `%${productDescription.toLowerCase()}%`,
      });
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;

      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('LOWER(v.sku) LIKE :q', { q })
            .orWhere('LOWER(v.barcode) LIKE :q', { q })
            .orWhere('LOWER(v.custom_sku) LIKE :q', { q })
            .orWhere('LOWER(p.name) LIKE :q', { q })
            .orWhere('LOWER(p.description) LIKE :q', { q })
            .orWhere(`LOWER(v.attributes->>'presentation') LIKE :q`, { q })
            .orWhere(`LOWER(v.attributes->>'variant') LIKE :q`, { q })
            .orWhere(`LOWER(v.attributes->>'color') LIKE :q`, { q });
        }),
      );
    }
    const total = await qb.clone().getCount();
    const { entities, raw } = await qb
      .select([
        'v.id',
        'v.productId',
        'v.sku',
        'v.customSku',
        'v.barcode',
        'v.attributes',
        'v.price',
        'v.cost',
        'v.isActive',
        'v.createdAt',
        'p.name',
        'p.description',
        'p.baseUnitId',
        'u.code',
        'u.name',
      ])
      .orderBy('v.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawAndEntities();
    const items = entities.map((row, idx) => {
      const r = raw[idx];
      return {
        variant: this.toDomain(row),
        productName: r.p_name,
        productDescription: r.p_description,
        baseUnitId: r.p_baseUnitId ?? r.p_base_unit_id,
        unitCode: r.u_code,
        unitName: r.u_name,
      };
    });
    return { items, total };
  }

  async findLastCreated(tx?: TransactionContext): Promise<ProductVariant | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder('v')
      .orderBy('v.created_at', 'DESC')
      .limit(1)
      .getOne();
    if (!row) return null;
    return this.toDomain(row);
  }

  async findLastSkuByPrefix(prefix: string, tx?: TransactionContext): Promise<string | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder('v')
      .select('v.sku', 'sku')
      .where('v.sku LIKE :pattern', { pattern: `${prefix}-%` })
      .orderBy('v.sku', 'DESC')
      .limit(1)
      .getRawOne<{ sku?: string }>();

    return row?.sku ?? null;
  }

  async update(
    params: {
      id: string;
      sku?: string;
      barcode?: string | null;
      customSku?: string | null;
      attributes?: AttributesRecord;
      price?: Money;
      cost?: Money;
    },
    tx?: TransactionContext,
  ): Promise<ProductVariant | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<ProductVariantEntity> = {};
    if (params.sku !== undefined) patch.sku = params.sku;
    if (params.barcode !== undefined) patch.barcode = params.barcode;
    if (params.customSku !== undefined) patch.customSku = params.customSku;
    if (params.attributes !== undefined) patch.attributes = params.attributes;
    if (params.price !== undefined) patch.price = params.price.getAmount();
    if (params.cost !== undefined) patch.cost = params.cost.getAmount();

    await repo.update({ id: params.id }, patch);
    const updated = await repo.findOne({ where: { id: params.id } });
    if (!updated) return null;
    return this.toDomain(updated);
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id }, { isActive });
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductVariant | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByIdWithProductInfo(
    id: string,
    tx?: TransactionContext,
  ): Promise<ProductVariantWithProductInfo | null> {
    const repo = this.getRepo(tx);
    const qb = repo
      .createQueryBuilder('v')
      .innerJoin(ProductEntity, 'p', 'p.product_id = v.product_id')
      .innerJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id')
      .where('v.id = :id', { id });

    const { entities, raw } = await qb
      .select([
        'v.id',
        'v.productId',
        'v.sku',
        'v.customSku',
        'v.barcode',
        'v.attributes',
        'v.price',
        'v.cost',
        'v.isActive',
        'v.createdAt',
        'p.name',
        'p.description',
        'p.baseUnitId',
        'u.code',
        'u.name',
      ])
      .getRawAndEntities();

    const row = entities[0];
    if (!row) return null;

    const r = raw[0];
    return {
      variant: this.toDomain(row),
      productName: r.p_name,
      productDescription: r.p_description,
      baseUnitId: r.p_baseUnitId ?? r.p_base_unit_id,
      unitCode: r.u_code,
      unitName: r.u_name,
    };
  }

  async findBySku(sku: string, tx?: TransactionContext): Promise<ProductVariant | null> {
    const row = await this.getRepo(tx).findOne({ where: { sku } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVariant | null> {
    const row = await this.getRepo(tx).findOne({ where: { barcode } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getRepo(tx).find({ 
      where: { 
        productId: productId.value
      } });
    return rows.map((row) => this.toDomain(row));
  }

  async listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getRepo(tx).find({ where: { productId: productId.value, isActive: true } });
    return rows.map((row) => this.toDomain(row));
  }

  async listRowMaterialVariant(row: boolean = true, tx?: TransactionContext): Promise<RowMaterial[]> {
    const qb = this.getManager(tx)
      .getRepository(ProductVariantEntity)
      .createQueryBuilder('v')
      .innerJoin(ProductEntity, 'p', 'p.product_id = v.product_id')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id');

    if (row) {
      qb.where('p.type = :type', { type: ProductType.PRIMA });
    } else {
      qb.where('p.type = :type', { type: ProductType.FINISHED });
    }

      const raw = await qb
        .select([
          'v.id',
          'v.productId',
          'v.sku',
          'v.attributes',
          'p.name',
          'p.description',
          'p.baseUnitId',
          'u.code',
          'u.name',
        ])
        .getRawMany();

    return raw.map((r) => ({
      primaId: r.v_variant_id,
      productName: r.p_name,
        productDescription: r.p_description,
        sku: r.v_sku,
        baseUnitId: r.p_baseUnitId,
        unitCode: r.u_code,
        unitName: r.u_name,
        type:'VARIANT',
        attributes: r.v_attributes,
      }));
    }

  async searchRowMaterialVariant(
    params: { q: string; raw?: boolean; withRecipes?: boolean },
    tx?: TransactionContext,
  ): Promise<RowMaterial[]> {
    const search = params.q?.trim();
    if (!search) return [];

    const q = `%${search.toLowerCase()}%`;
    const raw = params.raw ?? true;

    const qb = this.getManager(tx)
      .getRepository(ProductVariantEntity)
      .createQueryBuilder('v')
      .innerJoin(ProductEntity, 'p', 'p.product_id = v.product_id')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id');
    if (params.withRecipes) {
      qb.innerJoin('product_recipes', 'r', 'r.finished_variant_id = v.variant_id').distinct(true);
    }
    qb.where('p.type = :type', { type: raw ? ProductType.PRIMA : ProductType.FINISHED });
    qb.andWhere(
      new Brackets((qb1) => {
        qb1
          .where('LOWER(v.sku) LIKE :q', { q })
          .orWhere('LOWER(v.barcode) LIKE :q', { q })
          .orWhere('LOWER(v.custom_sku) LIKE :q', { q })
          .orWhere('LOWER(p.name) LIKE :q', { q })
          .orWhere('LOWER(p.description) LIKE :q', { q })
          .orWhere(`LOWER(v.attributes->>'presentation') LIKE :q`, { q })
          .orWhere(`LOWER(v.attributes->>'variant') LIKE :q`, { q })
          .orWhere(`LOWER(v.attributes->>'color') LIKE :q`, { q });
      }),
    );

    const rows = await qb
      .select([
        'v.id',
        'v.productId',
        'v.sku',
        'v.customSku',
        'v.attributes',
        'p.name',
        'p.description',
        'p.baseUnitId',
        'u.code',
        'u.name',
      ])
      .getRawMany();

    return rows.map((r) => ({
      primaId: r.v_variant_id,
      productName: r.p_name,
      productDescription: r.p_description,
      sku: r.v_sku,
      baseUnitId: r.p_baseUnitId,
      unitCode: r.u_code,
      unitName: r.u_name,
      type: 'VARIANT',
      attributes: r.v_attributes,
      customSku: r.v_custom_sku,
    }));
  }

  async listFinishedWithRecipesVariant(tx?: TransactionContext): Promise<RowMaterial[]> {
    const qb = this.getManager(tx)
      .getRepository(ProductVariantEntity)
      .createQueryBuilder('v')
      .innerJoin(ProductEntity, 'p', 'p.product_id = v.product_id')
      .innerJoin('product_recipes', 'r', 'r.finished_variant_id = v.variant_id')
      .leftJoin(UnitEntity, 'u', 'u.unit_id = p.base_unit_id')
      .where('p.type = :type', { type: ProductType.FINISHED })
      .distinct(true);

      const raw = await qb
        .select([
          'v.id',
          'v.productId',
          'v.sku',
          'v.customSku',
          'v.attributes',
          'p.name',
          'p.description',
          'p.baseUnitId',
          'u.code',
          'u.name',
        ])
        .getRawMany();

    return raw.map((r) => ({
      primaId: r.v_variant_id,
      productName: r.p_name,
      productDescription: r.p_description,
      sku: r.v_sku,
      baseUnitId: r.p_baseUnitId,
      unitCode: r.u_code,
      unitName: r.u_name,
      type: 'VARIANT',
      attributes: r.v_attributes,
      customSku:r.v_custom_sku
      }));
    }


  async listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getRepo(tx).find({ where: { productId: productId.value, isActive: false } });
    return rows.map((row) => this.toDomain(row));
  }

  async countAll(tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).count();
  }

  async countByActive(isActive: boolean, tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).count({ where: { isActive } });
  }

  async countCreatedSince(from: Date, tx?: TransactionContext): Promise<number> {
    return this.getRepo(tx).createQueryBuilder('v').where('v.created_at >= :from', { from }).getCount();
  }

  async countUpdatedSince(from: Date, tx?: TransactionContext): Promise<number> {
    // product_variants no tiene updated_at mapeado; se usa created_at como aproximacion.
    return this.getRepo(tx).createQueryBuilder('v').where('v.created_at >= :from', { from }).getCount();
  }

  async createdByMonthSince(from: Date, tx?: TransactionContext): Promise<Array<{ month: string; count: number }>> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder('v')
      .select(`to_char(date_trunc('month', v.created_at), 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)::int', 'count')
      .where('v.created_at >= :from', { from })
      .groupBy(`date_trunc('month', v.created_at)`)
      .orderBy(`date_trunc('month', v.created_at)`, 'ASC')
      .getRawMany<{ month: string; count: string }>();

    return rows.map((r) => ({ month: r.month, count: Number(r.count) }));
  }

  async latest(
    limit: number,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; sku: string; productId: string; isActive: boolean; createdAt: Date }>> {
    const rows = await this.getRepo(tx).find({
      select: { id: true, sku: true, productId: true, isActive: true, createdAt: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      productId: r.productId,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
  }

  private toDomain(row: ProductVariantEntity): ProductVariant {
    return new ProductVariant(
      row.id,
      ProductId.create(row.productId),
      row.sku,
      row.barcode,
      row.attributes,
      // "numeric" from Postgres can arrive as string; normalize to number
      Money.create(Number(row.price)),
      Money.create(Number(row.cost ?? 0)),
      row.isActive,
      row.createdAt,
      row.customSku,
    );
  }
}

