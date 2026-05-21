import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PackEntity } from "./pack.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";

@Entity("pack_items")
@Index(["packId", "skuId"], { unique: true })
export class PackItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "pack_id", type: "uuid" })
  packId: string;

  @ManyToOne(() => PackEntity, (pack) => pack.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "pack_id" })
  pack: PackEntity;

  @Column({ name: "sku_id", type: "uuid" })
  skuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "sku_id" })
  sku: ProductCatalogSkuEntity;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  price: number;
}

