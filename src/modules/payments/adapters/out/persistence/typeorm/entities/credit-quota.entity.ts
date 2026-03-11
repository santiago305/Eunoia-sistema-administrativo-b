import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("credit_quotas")
export class CreditQuotaEntity {
  @PrimaryGeneratedColumn("uuid", { name: "quota_id" })
  id: string;

  @Column({ name: "number", type: "int" })
  number: number;

  @Column({ name: "expiration_date", type: "timestamptz" })
  expirationDate: Date;

  @Column({ name: "payment_date", type: "timestamptz", nullable: true })
  paymentDate?: Date | null;

  @Column({ name: "total_to_pay", type: "numeric", precision: 12, scale: 2 })
  totalToPay: number;

  @Column({ name: "total_paid", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalPaid: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
