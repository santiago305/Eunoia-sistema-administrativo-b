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

  @Column({ name: "quantity", type: "numeric", precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: "total", type: "numeric", precision: 12, scale: 2, default: 0 })
  total: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

