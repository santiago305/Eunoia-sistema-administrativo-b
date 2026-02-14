import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { ProductEntity } from '../entities/product.entity';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductVariantWithProductInfo } from 'src/modules/catalog/domain/read-models/product-variant-with-product-info.rm';
import { AttributesRecord } from 'src/modules/catalog/domain/value-object/variant-attributes.vo';

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
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ProductVariantWithProductInfo[]; total: number }> {
    const repo = this.getRepo(tx);
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const qb = repo.createQueryBuilder('v').innerJoin(ProductEntity, 'p', 'p.product_id = v.product_id');

    if (params.productId) qb.andWhere('v.product_id = :productId', { productId: params.productId.value });
    if (params.isActive !== undefined) qb.andWhere('v.is_active = :isActive', { isActive: params.isActive });
    if (params.sku) qb.andWhere('v.sku ILIKE :sku', { sku: `%${params.sku}%` });
    if (params.barcode) qb.andWhere('v.barcode ILIKE :barcode', { barcode: `%${params.barcode}%` });
    if (params.productName) qb.andWhere('p.name ILIKE :productName', { productName: `%${params.productName}%` });
    if (params.productDescription) {
      qb.andWhere('p.description ILIKE :productDescription', { productDescription: `%${params.productDescription}%` });
    }
    if (params.q) {
      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('v.sku ILIKE :q', { q: `%${params.q}%` })
            .orWhere('v.barcode ILIKE :q', { q: `%${params.q}%` })
            .orWhere('p.name ILIKE :q', { q: `%${params.q}%` })
            .orWhere('p.description ILIKE :q', { q: `%${params.q}%` });
        }),
      );
    }

    const total = await qb.clone().getCount();
    const { entities, raw } = await qb
      .select([
        'v.id',
        'v.productId',
        'v.sku',
        'v.barcode',
        'v.attributes',
        'v.price',
        'v.cost',
        'v.isActive',
        'v.createdAt',
        'p.name',
        'p.description',
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
    const rows = await this.getRepo(tx).find({ where: { productId: productId.value } });
    return rows.map((row) => this.toDomain(row));
  }

  async listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getRepo(tx).find({ where: { productId: productId.value, isActive: true } });
    return rows.map((row) => this.toDomain(row));
  }

  async listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getRepo(tx).find({ where: { productId: productId.value, isActive: false } });
    return rows.map((row) => this.toDomain(row));
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
    );
  }
}

