import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';
import { ProductId } from 'src/modules/catalog/domain/value-object/product.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

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
      productId: (variant as any).product_id.value,
      sku: (variant as any).sku,
      barcode: (variant as any).barcode,
      attributes: (variant as any).attributes,
      price: (variant as any).price.getAmount(),
      cost: (variant as any).cost.getAmount(),
      isActive: (variant as any).isActive ?? true,
    });

    return new ProductVariant(
      saved.id,
      new ProductId(saved.productId),
      saved.sku,
      saved.barcode,
      saved.attributes,
      new Money(saved.price),
      new Money(saved.cost),
      saved.isActive,
      saved.createdAt,
    );
  }
  async search(
    params: {
      productId?: ProductId;
      isActive?: boolean;
      sku?: string;
      barcode?: string;
    },
    tx?: TransactionContext,
  ): Promise<ProductVariant[]> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder('v');

    if (params.productId) {
      qb.andWhere('v.productId = :productId', {
        productId: params.productId.value,
      });
    }
    if (params.isActive !== undefined) {
      qb.andWhere('v.isActive = :isActive', {
        isActive: params.isActive,
      });
    }
    if (params.sku) {
      qb.andWhere('v.sku ILIKE :sku', {
        sku: `%${params.sku}%`,
      });
    }
    if (params.barcode) {
      qb.andWhere('v.barcode ILIKE :barcode', {
        barcode: `%${params.barcode}%`,
      });
    }
    qb.orderBy('v.createdAt', 'DESC');
    const rows = await qb.getMany();
    return rows.map(
      (row) =>
        new ProductVariant(
          row.id,
          new ProductId(row.productId),
          row.sku,
          row.barcode,
          row.attributes,
          new Money(row.price),
          new Money(row.cost),
          row.isActive,
          row.createdAt,
        ),
    );
  }

  async update(
    params: {
      id: string;
      sku?: string;
      barcode?: string;
      attributes?: string;
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

    return new ProductVariant(
      updated.id,
      new ProductId(updated.productId),
      updated.sku,
      updated.barcode,
      updated.attributes,
      new Money(updated.price),
      new Money(updated.cost),
      updated.isActive,
      updated.createdAt,
    );
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    await repo.update({ id }, { isActive });
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductVariant | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({ where: { id } });
    if (!row) return null;

    return new ProductVariant(
      row.id,
      new ProductId(row.productId),
      row.sku,
      row.barcode,
      row.attributes,
      new Money(row.price),
      new Money(row.cost),
      row.isActive,
      row.createdAt,
    );
  }

  async findBySku(sku: string, tx?: TransactionContext): Promise<ProductVariant | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({ where: { sku } });
    if (!row) return null;

    return new ProductVariant(
      row.id,
      new ProductId(row.productId),
      row.sku,
      row.barcode,
      row.attributes,
      new Money(row.price),
      new Money(row.cost),
      row.isActive,
      row.createdAt,
    );
  }

  async findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVariant | null> {
    const repo = this.getRepo(tx);
    const row = await repo.findOne({ where: { barcode } });
    if (!row) return null;

    return new ProductVariant(
      row.id,
      new ProductId(row.productId),
      row.sku,
      row.barcode,
      row.attributes,
      new Money(row.price),
      new Money(row.cost),
      row.isActive,
      row.createdAt,
    );
  }

  async listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({ where: {  productId: productId.value  } });
    return rows.map(
      (row) =>
        new ProductVariant(
          row.id,
          new ProductId(row.productId),
          row.sku,
          row.barcode,
          row.attributes,
          new Money(row.price),
          new Money(row.cost),
          row.isActive,
          row.createdAt,
        ),
    );
  }

  async listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({ where: {  productId: productId.value , isActive: true } });
    return rows.map(
      (row) =>
        new ProductVariant(
          row.id,
          new ProductId(row.productId),
          row.sku,
          row.barcode,
          row.attributes,
          new Money(row.price),
          new Money(row.cost),
          row.isActive,
          row.createdAt,
        ),
    );
  }

  async listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({ where: { productId: productId.value , isActive: false } });
    return rows.map(
      (row) =>
        new ProductVariant(
          row.id,
          new ProductId(row.productId),
          row.sku,
          row.barcode,
          row.attributes,
          new Money(row.price),
          new Money(row.cost),
          row.isActive,
          row.createdAt,
        ),
    );
  }
}

