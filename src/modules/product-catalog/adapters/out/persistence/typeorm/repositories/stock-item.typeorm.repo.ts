import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogStockItem } from "src/modules/product-catalog/domain/entities/stock-item";
import { ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { ProductCatalogStockItemEntity } from "../entities/stock-item.entity";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class ProductCatalogStockItemTypeormRepository implements ProductCatalogStockItemRepository {
  constructor(
    @InjectRepository(ProductCatalogStockItemEntity)
    private readonly repo: Repository<ProductCatalogStockItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogStockItemEntity);
  }

  private toDomain(row: ProductCatalogStockItemEntity): ProductCatalogStockItem {
    return new ProductCatalogStockItem(row.id, row.skuId, row.isActive, row.createdAt);
  }

  async create(input: ProductCatalogStockItem, tx?: TransactionContext): Promise<ProductCatalogStockItem> {
    const saved = await this.getRepo(tx).save({
      skuId: input.skuId,
      isActive: input.isActive,
    });
    return this.toDomain(saved);
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductCatalogStockItem | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySkuId(skuId: string, tx?: TransactionContext): Promise<ProductCatalogStockItem | null> {
    const row = await this.getRepo(tx).findOne({ where: { skuId } });
    return row ? this.toDomain(row) : null;
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id }, { isActive });
  }
}
