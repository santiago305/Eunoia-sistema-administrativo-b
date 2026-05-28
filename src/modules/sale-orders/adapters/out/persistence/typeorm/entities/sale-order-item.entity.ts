import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("sale_order_items")
@Index("idx_sale_order_items_sale_order", ["saleOrderId"])
export class SaleOrderItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_id", type: "uuid" })
  saleOrderId: string;

  @Column({ name: "reference_pack_id", type: "uuid", nullable: true })
  referencePackId?: string | null;

  @Column({ name: "description", type: "varchar", length: 255, nullable: true })
  description?: string | null;

  @Column({ name: "quantity", type: "numeric", precision: 12, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: "total", type: "numeric", precision: 12, scale: 2, default: 0 })
  total: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

