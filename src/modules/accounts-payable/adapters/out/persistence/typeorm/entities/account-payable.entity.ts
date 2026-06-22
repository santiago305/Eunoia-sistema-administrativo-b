import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";

@Entity("accounts_payable")
@Index("idx_accounts_payable_purchase", ["purchaseId"])
@Index("idx_accounts_payable_quota", ["quotaId"])
@Index("idx_accounts_payable_status", ["status"])
export class AccountPayableEntity {
  @PrimaryGeneratedColumn("uuid", { name: "account_payable_id" })
  id: string;

  @Column({ name: "purchase_id", type: "uuid" })
  purchaseId: string;

  @Column({ name: "quota_id", type: "uuid", nullable: true })
  quotaId?: string | null;

  @Column({ name: "supplier_id", type: "uuid", nullable: true })
  supplierId?: string | null;

  @Column({ name: "description", type: "varchar", length: 250, nullable: true })
  description?: string | null;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type" })
  currency: CurrencyType;

  @Column({ name: "amount_total", type: "numeric", precision: 12, scale: 2 })
  amountTotal: number;

  @Column({ name: "amount_paid", type: "numeric", precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ name: "amount_pending", type: "numeric", precision: 12, scale: 2 })
  amountPending: number;

  @Column({ name: "due_date", type: "date", nullable: true })
  dueDate?: Date | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "PENDING" })
  status: PayableStatus;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}

