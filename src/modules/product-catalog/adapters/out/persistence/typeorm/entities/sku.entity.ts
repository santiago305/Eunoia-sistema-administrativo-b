import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ProductCatalogProductEntity } from "./product.entity";

@Entity("pc_skus")
@Index("ux_pc_skus_backend_sku", ["backendSku"], { unique: true })
@Index("ux_pc_skus_custom_sku", ["customSku"], { unique: true, where: '"custom_sku" IS NOT NULL' })
@Index("ux_pc_skus_barcode", ["barcode"], { unique: true, where: '"barcode" IS NOT NULL' })
@Index("idx_pc_skus_product", ["productId"])
export class ProductCatalogSkuEntity {
  @PrimaryGeneratedColumn("uuid", { name: "sku_id" })
  id: string;

  @Column({ name: "product_id", type: "uuid" })
  productId: string;

  @ManyToOne(() => ProductCatalogProductEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product?: ProductCatalogProductEntity;

  @Column({ name: "backend_sku", type: "varchar", length: 80 })
  backendSku: string;

  @Column({ name: "custom_sku", type: "varchar", length: 80, nullable: true })
  customSku: string | null;

  @Column({ type: "varchar", length: 180 })
  name: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  barcode: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ name: "is_sellable", type: "boolean", default: true })
  isSellable: boolean;

  @Column({ name: "is_purchasable", type: "boolean", default: false })
  isPurchasable: boolean;

  @Column({ name: "is_manufacturable", type: "boolean", default: false })
  isManufacturable: boolean;

  @Column({ name: "is_stock_tracked", type: "boolean", default: true })
  isStockTracked: boolean;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
