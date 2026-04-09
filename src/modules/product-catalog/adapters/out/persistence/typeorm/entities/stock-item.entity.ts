import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductCatalogSkuEntity } from "./sku.entity";

@Entity("pc_stock_items")
@Index("ux_pc_stock_items_sku", ["skuId"], { unique: true })
export class ProductCatalogStockItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "stock_item_id" })
  id: string;

  @Column({ name: "sku_id", type: "uuid" })
  skuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sku_id" })
  sku?: ProductCatalogSkuEntity;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
