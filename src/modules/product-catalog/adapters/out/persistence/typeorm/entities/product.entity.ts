import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

@Entity("pc_products")
@Index("ux_pc_products_name", ["name"], { unique: true })
@Index("idx_pc_products_type", ["type"])
export class ProductCatalogProductEntity {
  @PrimaryGeneratedColumn("uuid", { name: "product_id" })
  id: string;

  @Column({ type: "varchar", length: 180 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "enum", enum: ProductCatalogProductType, enumName: "pc_product_type" })
  type: ProductCatalogProductType;

  @Column({ type: "varchar", length: 120, nullable: true })
  brand: string | null;

  @Column({ name: "base_unit_id", type: "uuid", nullable: true })
  baseUnitId: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
