import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRecipe } from 'src/modules/catalog/domain/entity/product-recipe';
import { ProductRecipeEntity } from '../entities/product-recipe.entity';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { ProductRecipeRepository } from 'src/modules/catalog/application/ports/product-recipe.repository';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Injectable()
export class ProductRecipeTypeormRepository implements ProductRecipeRepository {
  constructor(
    @InjectRepository(ProductRecipeEntity)
    private readonly repo: Repository<ProductRecipeEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductRecipeEntity);
  }

  async create(recipe: ProductRecipe, tx?: TransactionContext): Promise<ProductRecipe> {
    const repo = this.getRepo(tx);
    const saved = await repo.save({
      finishedType: recipe.finishedType,
      finishedItemId: recipe.finishedItemId,
      primaVariantId: recipe.primaVariantId,
      quantity: recipe.quantity,
      waste: recipe.waste ?? null,
    });
    return this.toDomain(saved);
  }

  async listByFinishedItem(
    finishedType: StockItemType,
    finishedItemId: string,
    tx?: TransactionContext,
  ): Promise<ProductRecipe[]> {
    const rows = await this.getRepo(tx).find({ where: { finishedType, finishedItemId } });
    return rows.map((row) => this.toDomain(row));
  }

  async listByVariantId(variantId: string, tx?: TransactionContext): Promise<ProductRecipe[]> {
    return this.listByFinishedItem(StockItemType.VARIANT, variantId, tx);
  }

  async listByProductId(productId: string, tx?: TransactionContext): Promise<ProductRecipe[]> {
    return this.listByFinishedItem(StockItemType.PRODUCT, productId, tx);
  }

  async listByItemId(itemId: string, tx?: TransactionContext): Promise<ProductRecipe[]> {
    const rows = await this.getRepo(tx).find({
      where: [{ finishedItemId: itemId, finishedType: StockItemType.PRODUCT }, { finishedItemId: itemId, finishedType: StockItemType.VARIANT }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductRecipe | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async deleteById(id: string, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).delete({ id });
  }

  private toDomain(row: ProductRecipeEntity): ProductRecipe {
    return new ProductRecipe(
      row.id,
      row.finishedType,
      row.finishedItemId,
      row.primaVariantId,
      Number(row.quantity),
      Number(row.waste) ?? undefined,
    );
  }
}
