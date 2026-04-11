import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogEquivalence } from "src/modules/product-catalog/domain/entities/equivalence";
import { ProductCatalogEquivalenceRepository } from "src/modules/product-catalog/domain/ports/equivalence.repository";
import { ProductCatalogEquivalencesEntity } from "../entities/equivalences.entity";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class ProductCatalogEquivalenceTypeormRepository implements ProductCatalogEquivalenceRepository {
  constructor(
    @InjectRepository(ProductCatalogEquivalencesEntity)
    private readonly repo: Repository<ProductCatalogEquivalencesEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogEquivalencesEntity);
  }

  private toDomain(row: ProductCatalogEquivalencesEntity): ProductCatalogEquivalence {
    return new ProductCatalogEquivalence(row.id, row.productId, row.fromUnitId, row.toUnitId, Number(row.factor));
  }

  async create(input: ProductCatalogEquivalence, tx?: TransactionContext): Promise<ProductCatalogEquivalence> {
    const saved = await this.getRepo(tx).save({
      productId: input.productId,
      fromUnitId: input.fromUnitId,
      toUnitId: input.toUnitId,
      factor: input.factor,
    });
    return this.toDomain(saved);
  }

  async delete(id: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id });
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductCatalogEquivalence | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByProductId(productId: string, tx?: TransactionContext): Promise<ProductCatalogEquivalence[]> {
    const rows = await this.getRepo(tx).find({ where: { productId } });
    return rows.map((row) => this.toDomain(row));
  }
}
