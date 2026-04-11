import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogUnit } from "src/modules/product-catalog/domain/entities/unit";
import { ProductCatalogUnitRepository } from "src/modules/product-catalog/domain/ports/unit.repository";
import { ProductCatalogUnitEntity } from "../entities/unit.entity";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class ProductCatalogUnitTypeormRepository implements ProductCatalogUnitRepository {
  constructor(
    @InjectRepository(ProductCatalogUnitEntity)
    private readonly repo: Repository<ProductCatalogUnitEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogUnitEntity);
  }

  private toDomain(row: ProductCatalogUnitEntity): ProductCatalogUnit {
    return new ProductCatalogUnit(row.id, row.name, row.code);
  }

  async create(input: ProductCatalogUnit, tx?: TransactionContext): Promise<ProductCatalogUnit> {
    const saved = await this.getRepo(tx).save({
      name: input.name,
      code: input.code,
    });
    return this.toDomain(saved);
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductCatalogUnit | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByCode(code: string, tx?: TransactionContext): Promise<ProductCatalogUnit | null> {
    const row = await this.getRepo(tx).findOne({ where: { code } });
    return row ? this.toDomain(row) : null;
  }

  async list(params?: { q?: string }, tx?: TransactionContext): Promise<ProductCatalogUnit[]> {
    const qb = this.getRepo(tx).createQueryBuilder("u");
    if (params?.q?.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere("(LOWER(u.name) LIKE :q OR LOWER(u.code) LIKE :q)", { q });
    }
    const rows = await qb.orderBy("u.name", "ASC").addOrderBy("u.code", "ASC").getMany();
    return rows.map((row) => this.toDomain(row));
  }
}
