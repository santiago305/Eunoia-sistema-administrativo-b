import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductCatalogSkuEntity } from "./sku.entity";

@Entity("pc_catalog_publications")
@Index("idx_pc_catalog_publications_channel", ["channelCode"])
@Index("ux_pc_catalog_publications_channel_sku", ["channelCode", "skuId"], { unique: true })
export class ProductCatalogPublicationEntity {
  @PrimaryGeneratedColumn("uuid", { name: "publication_id" })
  id: string;

  @Column({ name: "channel_code", type: "varchar", length: 80 })
  channelCode: string;

  @Column({ name: "sku_id", type: "uuid" })
  skuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sku_id" })
  sku?: ProductCatalogSkuEntity;

  @Column({ name: "is_visible", type: "boolean", default: true })
  isVisible: boolean;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "price_override", type: "numeric", precision: 12, scale: 2, nullable: true })
  priceOverride: number | null;

  @Column({ name: "display_name_override", type: "varchar", length: 255, nullable: true })
  displayNameOverride: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
