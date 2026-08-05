import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("sale_order_item_components")
@Index("idx_sale_order_item_components_item", ["saleOrderItemId"])
@Index("idx_sale_order_item_components_sku", ["skuId"])
export class SaleOrderItemComponentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_item_id", type: "uuid" })
  saleOrderItemId: string;

  @Column({ name: "sku_id", type: "uuid" })
  skuId: string;

  @Column({ name: "reference_pack_item_id", type: "uuid", nullable: true })
  referencePackItemId?: string | null;

  @Column({ name: "sku_name_snapshot", type: "varchar", length: 180, nullable: true })
  skuNameSnapshot?: string | null;

  @Column({ name: "backend_sku_snapshot", type: "varchar", length: 80, nullable: true })
  backendSkuSnapshot?: string | null;

  @Column({ name: "custom_sku_snapshot", type: "varchar", length: 80, nullable: true })
  customSkuSnapshot?: string | null;

  @Column({ name: "barcode_snapshot", type: "varchar", length: 80, nullable: true })
  barcodeSnapshot?: string | null;

  @Column({ name: "image_snapshot", type: "text", nullable: true })
  imageSnapshot?: string | null;

  @Column({ name: "product_id_snapshot", type: "uuid", nullable: true })
  productIdSnapshot?: string | null;

  @Column({ name: "attributes_snapshot", type: "jsonb", default: () => "'[]'::jsonb" })
  attributesSnapshot: Array<{ code: string; name: string | null; value: string }>;

  @Column({ name: "quantity", type: "numeric", precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: "total", type: "numeric", precision: 12, scale: 2, default: 0 })
  total: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

