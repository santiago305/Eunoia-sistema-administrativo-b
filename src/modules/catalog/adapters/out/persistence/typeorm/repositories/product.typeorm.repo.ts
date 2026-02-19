import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepository } from 'src/modules/catalog/domain/ports/product.repository';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductEntity } from '../entities/product.entity';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

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
      name: prod.getName(),
      description: prod.getDescription(),
      type: prod.getType(),
      isActive: prod.getIsActive() ?? true,
    });

    return new Product(
      ProductId.create(saved.id),
      saved.name,
      saved.description,
      saved.isActive,
      saved.createdAt,
      saved.updatedAt,
      saved.type ?? undefined,
    );
  }

  async findById(id: ProductId, tx?: TransactionContext): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({ where: { id: id.value } });
    if (!row) return null;

    return new Product(
      ProductId.create(row.id),
      row.name,
      row.description,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.type ?? undefined,
    );
  }

  async findByName(name: string, tx?: TransactionContext): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const row = await repo
      .createQueryBuilder('p')
      .where('LOWER(p.name) = LOWER(:name)', { name: name.trim() })
      .orderBy('p.created_at', 'DESC')
      .getOne();
    if (!row) return null;

    return new Product(
      ProductId.create(row.id),
      row.name,
      row.description,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  async searchPaginated(
    params: { isActive?: boolean; name?: string; description?: string; type?: ProductType; page: number; q?: string; limit: number },
    tx?: TransactionContext,
  ): Promise<{ items: Product[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder('p');

    if (params.name) qb.andWhere('LOWER(p.name) LIKE LOWER(:name)', { name: `%${params.name}%` });
    if (params.description) qb.andWhere('LOWER(p.description) LIKE LOWER(:description)', { description: `%${params.description}%` });
    if (params.type)   qb.andWhere('p.type = :type', { type: params.type });
    if (params.isActive !== undefined) qb.andWhere('p.is_active = :isActive', { isActive: params.isActive });
    if (params.q) {
      qb.andWhere('(LOWER(p.name) LIKE LOWER(:q) OR LOWER(p.description) LIKE LOWER(:q))', { q: `%${params.q}%` });
    }

    const skip = (params.page - 1) * params.limit;
    const [rows, total] = await qb.orderBy('p.created_at', 'DESC').skip(skip).take(params.limit).getManyAndCount();

    return {
      items: rows.map((row) =>
        new Product(ProductId.create(row.id), row.name, row.description, row.isActive, row.createdAt, row.updatedAt, row.type ?? undefined),
      ),
      total,
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
    params: { id: ProductId; name?: string; description?: string; type?: ProductType },
    tx?: TransactionContext,
  ): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<ProductEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.description !== undefined) patch.description = params.description;
    if (params.type !== undefined) patch.type = params.type;

    await repo.update({ id: params.id.value }, patch);
    const updated = await repo.findOne({ where: { id: params.id.value } });
    if (!updated) return null;

    return new Product(
      ProductId.create(updated.id),
      updated.name,
      updated.description,
      updated.isActive,
      updated.createdAt,
      updated.updatedAt,
      updated.type ?? undefined,
    );
  }

  async setActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: id.value }, { isActive });
  }

  async setAllVariantsActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getVariantRepo(tx).update({ productId: id.value }, { isActive });
  }

  async listActive(tx?: TransactionContext): Promise<Product[]> {
    const rows = await this.getRepo(tx).find({ where: { isActive: true } });
    return rows.map((row) =>
      new Product(ProductId.create(row.id), row.name, row.description, row.isActive, row.createdAt, row.updatedAt, row.type ?? undefined),
    );
  }

  async listInactive(tx?: TransactionContext): Promise<Product[]> {
    const rows = await this.getRepo(tx).find({ where: { isActive: false } });
    return rows.map((row) =>
      new Product(ProductId.create(row.id), row.name, row.description, row.isActive, row.createdAt, row.updatedAt, row.type ?? undefined),
    );
  }

  async listVariants(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const rows = await this.getVariantRepo(tx).find({ where: { productId: productId.value } });
    return rows.map((r) =>
      new ProductVariant(
        r.id,
        ProductId.create(productId.value),
        r.sku,
        r.barcode,
        r.attributes,
        Money.create(Number(r.price)),
        Money.create(Number(r.cost ?? 0)),
        r.isActive,
        r.createdAt,
        r.baseUnitId,
      ),
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
}

