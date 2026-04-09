import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductCatalogRecipeItem } from "src/modules/product-catalog/domain/entities/recipe-item";
import { ProductCatalogRecipe } from "src/modules/product-catalog/domain/entities/recipe";
import {
  ProductCatalogRecipeRepository,
  ProductCatalogRecipeWithItems,
} from "src/modules/product-catalog/domain/ports/recipe.repository";
import { ProductCatalogRecipeItemEntity } from "../entities/recipe-item.entity";
import { ProductCatalogRecipeEntity } from "../entities/recipe.entity";

@Injectable()
export class ProductCatalogRecipeTypeormRepository implements ProductCatalogRecipeRepository {
  constructor(
    @InjectRepository(ProductCatalogRecipeEntity)
    private readonly repo: Repository<ProductCatalogRecipeEntity>,
    @InjectRepository(ProductCatalogRecipeItemEntity)
    private readonly itemRepo: Repository<ProductCatalogRecipeItemEntity>,
  ) {}

  private toRecipe(row: ProductCatalogRecipeEntity): ProductCatalogRecipe {
    return new ProductCatalogRecipe(
      row.id,
      row.skuId,
      row.version,
      Number(row.yieldQuantity),
      row.notes ?? null,
      row.isActive,
      row.createdAt,
    );
  }

  private toItem(row: ProductCatalogRecipeItemEntity): ProductCatalogRecipeItem {
    return new ProductCatalogRecipeItem(
      row.id,
      row.recipeId,
      row.materialSkuId,
      Number(row.quantity),
      row.unitId,
    );
  }

  async create(input: {
    recipe: ProductCatalogRecipe;
    items: ProductCatalogRecipeItem[];
  }): Promise<ProductCatalogRecipeWithItems> {
    return this.repo.manager.transaction(async (manager) => {
      await manager.getRepository(ProductCatalogRecipeEntity).update(
        { skuId: input.recipe.skuId, isActive: true },
        { isActive: false },
      );

      const savedRecipe = await manager.getRepository(ProductCatalogRecipeEntity).save({
        skuId: input.recipe.skuId,
        version: input.recipe.version,
        yieldQuantity: input.recipe.yieldQuantity,
        notes: input.recipe.notes,
        isActive: input.recipe.isActive,
      });

      const savedItems = await manager.getRepository(ProductCatalogRecipeItemEntity).save(
        input.items.map((item) => ({
          recipeId: savedRecipe.id,
          materialSkuId: item.materialSkuId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
      );

      return {
        recipe: this.toRecipe(savedRecipe),
        items: savedItems.map((item) => this.toItem(item)),
      };
    });
  }

  async findActiveBySkuId(skuId: string): Promise<ProductCatalogRecipeWithItems | null> {
    const recipe = await this.repo.findOne({
      where: { skuId, isActive: true },
      order: { createdAt: "DESC" },
    });
    if (!recipe) return null;
    const items = await this.itemRepo.find({
      where: { recipeId: recipe.id },
      order: { id: "ASC" },
    });
    return {
      recipe: this.toRecipe(recipe),
      items: items.map((item) => this.toItem(item)),
    };
  }
}
