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
import { ProductId } from 'src/modules/catalog/domain/value-object/product.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

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
  private getVariant(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductVariantEntity);
  }

  async created(prod: Product, tx?: TransactionContext): Promise<Product> {
    const repo = this.getRepo(tx);
    const saved = await repo.save({
      name: (prod as any).name,
      description: (prod as any).description,
      isActive: (prod as any).isActive ?? true,
    });

    return new Product(
      new ProductId(saved.id),
      saved.name,
      saved.description,
      saved.isActive,
      saved.createdAt,
      saved.updatedAt,
    );
  }
  async findById(id: string, tx?: TransactionContext): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({ where: { id } });
    if (!row) return null;

    return new Product(
      new ProductId(row.id),
      row.name,
      row.description,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }
  async searchPaginated(
    params: { isActive?: boolean; name?: string; description?: string; page: number;
      q?:string, limit: number },
    tx?: TransactionContext,
  ): Promise<{ items: Product[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder('p');

    if (params.name) {
      qb.andWhere(
        'unaccent(p.name) ILIKE unaccent(:name)',
        { name: `%${params.name}%` },
      );
    }
    if (params.description) {
      qb.andWhere(
        'unaccent(p.description) ILIKE unaccent(:description)',
        { description: `%${params.description}%` },
      );
    }
    if (params.isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive: params.isActive });
    }

    if(params.q){
      qb.andWhere(
        `(unaccent(p.name) ILIKE unaccent(:q)
          OR
          unaccent(p.description) ILIKE unaccent(:q))`,
        { q: `%${params.q}%` },
      );
    }

    const skip = (params.page - 1) * params.limit;

    const [rows, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(params.limit)
      .getManyAndCount();

    return {
      items: rows.map(
        (row) =>
          new Product(
            new ProductId(row.id),
            row.name,
            row.description,
            row.isActive,
            row.createdAt,
            row.updatedAt,
          ),
      ),
      total,
    };
  }
  async getByIdWithVariants(
      docId: string,
      tx?: TransactionContext,
    ): Promise<{ product: Product; items: ProductVariant[] } | null> {
      const product = await this.findById(docId, tx);
      if (!product) return null;
      const items = await this.listVariants(docId, tx);
      return { product, items };
    }
  async updated(
    params: { id: string; name?: string; description?: string },
    tx?: TransactionContext,
  ): Promise<Product | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<ProductEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.description !== undefined) patch.description = params.description;

    await repo.update({ id: params.id }, patch);

    const updated = await repo.findOne({ where: { id: params.id } });
    if (!updated) return null;

    return new Product(
      new ProductId(updated.id),
      updated.name,
      updated.description,
      updated.isActive,
      updated.createdAt,
      updated.updatedAt,
    );
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    await repo.update({ id }, { isActive });
  }
  async setAllVariantsActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    const repo = this.getVariant(tx);
    await repo.update({ id }, { isActive });
  }


  async listActive(tx?: TransactionContext): Promise<Product[]> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({ where: { isActive: true } });
    return rows.map(
      (row) =>
        new Product(
          new ProductId(row.id),
          row.name,
          row.description,
          row.isActive,
          row.createdAt,
          row.updatedAt,
        ),
    );
  }

  async listInactive(tx?: TransactionContext): Promise<Product[]> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({ where: { isActive: false } });
    return rows.map(
      (row) =>
        new Product(
          new ProductId(row.id),
          row.name,
          row.description,
          row.isActive,
          row.createdAt,
          row.updatedAt,
        ),
    );
  }
  async listVariants(productId: string, tx?: TransactionContext): Promise<ProductVariant[]> {
      const repo = this.getVariant(tx);
      const rows = await repo.find({ where: { productId } });
      return rows.map(
        (r) =>
          new ProductVariant(
            r.id,
            new ProductId(productId),
            r.sku,
            r.barcode,
            r.attributes,
            new Money(Number(r.price)),
            new Money(Number(r.cost)),
            r.isActive,
            r.createdAt,
          ),
      );
    }
}

