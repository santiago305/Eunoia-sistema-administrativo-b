import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRecipeRepository } from 'src/modules/catalog/domain/ports/product-recipe.repository';
import { ProductRecipe } from 'src/modules/catalog/domain/entity/product-recipe';
import { ProductRecipeEntity } from '../entities/product-recipe.entity';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.transaction-context';
import { VariantId } from 'src/modules/inventory/domain/value-objects/ids';

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
      finishedVariantId: recipe.finishedVariantId,
      primaVariantId: recipe.primaVariantId,
      quantity: recipe.quantity,
      waste: recipe.waste ?? null,
    });
    return this.toDomain(saved);
  }

  async listByVariantId(variantId: VariantId, tx?: TransactionContext): Promise<ProductRecipe[]> {
    const rows = await this.getRepo(tx).find({ where: { finishedVariantId: variantId.value } });
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
      row.finishedVariantId,
      row.primaVariantId,
      Number(row.quantity),
      Number(row.waste) ?? undefined,
    );
  }
}
