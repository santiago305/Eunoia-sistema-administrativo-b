import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepository } from 'src/modules/catalag/domain/ports/product.repository';
import { Product } from 'src/modules/catalag/domain/entity/product';
import { ProductEntity } from '../entities/product.entity';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';

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

  async created(prod: Product, tx?: TransactionContext): Promise<Product> {
    const repo = this.getRepo(tx);
    const saved = await repo.save({
      name: (prod as any).name,
      description: (prod as any).description,
      isActive: (prod as any).isActive ?? true,
    });

    return new Product(
      saved.id,
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
      row.id,
      row.name,
      row.description,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }
  async search(
    params: { name?: string; description?: string },
    tx?: TransactionContext,
  ): Promise<Product[]> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder('p');

    if (params.name) {
      qb.andWhere('LOWER(p.name) LIKE LOWER(:name)', { name: `%${params.name}%` });
    }
    if (params.description) {
      qb.andWhere('LOWER(p.description) LIKE LOWER(:description)', { description: `%${params.description}%` });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();

    return rows.map(
      (row) =>
        new Product(
          row.id,
          row.name,
          row.description,
          row.isActive,
          row.createdAt,
          row.updatedAt,
        ),
    );
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
      updated.id,
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

  async listActive(tx?: TransactionContext): Promise<Product[]> {
    const repo = this.getRepo(tx);
    const rows = await repo.find({ where: { isActive: true } });
    return rows.map(
      (row) =>
        new Product(
          row.id,
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
          row.id,
          row.name,
          row.description,
          row.isActive,
          row.createdAt,
          row.updatedAt,
        ),
    );
  }
}
