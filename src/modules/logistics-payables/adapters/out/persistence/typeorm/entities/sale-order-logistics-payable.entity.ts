import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("sale_order_logistics_payables")
@Index("idx_sale_order_logistics_payables_sale_order", ["saleOrderId"])
@Index("idx_sale_order_logistics_payables_account_payable", ["accountPayableId"])
export class SaleOrderLogisticsPayableEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_id", type: "uuid" })
  saleOrderId: string;

  @Column({ name: "purchase_id", type: "uuid" })
  purchaseId: string;

  @Column({ name: "account_payable_id", type: "uuid" })
  accountPayableId: string;

  @Column({ name: "agency_subsidiary_id", type: "uuid" })
  agencySubsidiaryId: string;

  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "status", type: "varchar", length: 20, default: "ACTIVE" })
  status: "ACTIVE" | "CANCELLED";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
