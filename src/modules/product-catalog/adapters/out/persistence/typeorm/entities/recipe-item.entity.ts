import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductCatalogRecipeEntity } from "./recipe.entity";
import { ProductCatalogSkuEntity } from "./sku.entity";

@Entity("pc_recipe_items")
export class ProductCatalogRecipeItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recipe_item_id" })
  id: string;

  @Column({ name: "recipe_id", type: "uuid" })
  recipeId: string;

  @ManyToOne(() => ProductCatalogRecipeEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "recipe_id" })
  recipe?: ProductCatalogRecipeEntity;

  @Column({ name: "material_sku_id", type: "uuid" })
  materialSkuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "material_sku_id" })
  materialSku?: ProductCatalogSkuEntity;

  @Column({ type: "numeric", precision: 12, scale: 3 })
  quantity: number;

  @Column({ name: "unit_id", type: "uuid" })
  unitId: string;
}
