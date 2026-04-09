import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductCatalogSkuEntity } from "./sku.entity";

@Entity("pc_recipes")
@Index("idx_pc_recipes_sku", ["skuId"])
export class ProductCatalogRecipeEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recipe_id" })
  id: string;

  @Column({ name: "sku_id", type: "uuid" })
  skuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sku_id" })
  sku?: ProductCatalogSkuEntity;

  @Column({ type: "int", default: 1 })
  version: number;

  @Column({ name: "yield_quantity", type: "numeric", precision: 12, scale: 3 })
  yieldQuantity: number;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
