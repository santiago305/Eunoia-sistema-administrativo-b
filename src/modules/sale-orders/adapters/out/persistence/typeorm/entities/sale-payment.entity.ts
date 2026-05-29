import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("sale_payments")
@Index("idx_sale_payments_sale_order", ["saleOrderId"])
export class SalePaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_id", type: "uuid" })
  saleOrderId: string;

  @Column({ name: "bank_account_id", type: "uuid", nullable: true })
  bankAccountId?: string | null;

  @Column({ name: "date", type: "timestamptz" })
  date: Date;

  @Column({ name: "method", type: "varchar", length: 100 })
  method: string;

  @Column({ name: "operation_number", type: "varchar", length: 100, nullable: true })
  operationNumber?: string | null;

  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "note", type: "varchar", length: 255, nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
