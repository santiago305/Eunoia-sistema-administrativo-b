import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RecurringFrequency } from "src/modules/recurring-purchases/domain/value-objects/recurring-frequency";
import { RecurringStatus } from "src/modules/recurring-purchases/domain/value-objects/recurring-status";

@Entity("recurring_purchase_templates")
@Index("idx_recurring_purchase_templates_status_due", ["status", "nextDueDate"])
@Index("idx_recurring_purchase_templates_supplier", ["supplierId"])
export class RecurringPurchaseTemplateEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recurring_purchase_template_id" })
  id: string;

  @Column({ name: "supplier_id", type: "uuid" })
  supplierId: string;

  @Column({ name: "name", type: "varchar", length: 160 })
  name: string;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "frequency", type: "varchar", length: 20 })
  frequency: RecurringFrequency;

  @Column({ name: "purchase_type", type: "enum", enum: PurchaseType, enumName: "purchase_type", default: PurchaseType.SUBSCRIPTION })
  purchaseType: PurchaseType;

  @Column({ name: "currency", type: "enum", enum: CurrencyType, enumName: "currency_type" })
  currency: CurrencyType;

  @Column({ name: "amount", type: "numeric", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "start_date", type: "date" })
  startDate: Date;

  @Column({ name: "next_due_date", type: "date" })
  nextDueDate: Date;

  @Column({ name: "billing_anchor_day", type: "int" })
  billingAnchorDay: number;

  @Column({ name: "status", type: "varchar", length: 20, default: "ACTIVE" })
  status: RecurringStatus;

  @Column({ name: "reminder_days_before", type: "jsonb", default: () => "'[7,3,1]'" })
  reminderDaysBefore: number[];

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId?: string | null;

  @Column({ name: "last_generated_at", type: "timestamptz", nullable: true })
  lastGeneratedAt?: Date | null;

  @Column({ name: "last_generated_period_key", type: "varchar", length: 20, nullable: true })
  lastGeneratedPeriodKey?: string | null;

  @Column({ name: "last_generated_purchase_id", type: "uuid", nullable: true })
  lastGeneratedPurchaseId?: string | null;

  @Column({ name: "last_generated_account_payable_id", type: "uuid", nullable: true })
  lastGeneratedAccountPayableId?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
