import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductCatalogAttributeEntity } from "./attribute.entity";
import { ProductCatalogSkuEntity } from "./sku.entity";

@Entity("pc_sku_attribute_values")
@Index("ux_pc_sku_attribute_values_sku_attribute", ["skuId", "attributeId"], { unique: true })
export class ProductCatalogSkuAttributeValueEntity {
  @PrimaryGeneratedColumn("uuid", { name: "sku_attribute_value_id" })
  id: string;

  @Column({ name: "sku_id", type: "uuid" })
  skuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sku_id" })
  sku?: ProductCatalogSkuEntity;

  @Column({ name: "attribute_id", type: "uuid" })
  attributeId: string;

  @ManyToOne(() => ProductCatalogAttributeEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "attribute_id" })
  attribute?: ProductCatalogAttributeEntity;

  @Column({ type: "varchar", length: 255 })
  value: string;
}
