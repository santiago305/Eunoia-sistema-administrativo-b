import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("recurring_purchase_reminder_deliveries")
@Index(
  "uq_recurring_purchase_reminder_deliveries_window",
  ["templateId", "periodKey", "dueDate", "daysBefore"],
  { unique: true },
)
@Index("idx_recurring_purchase_reminder_deliveries_template", ["templateId"])
export class RecurringPurchaseReminderDeliveryEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recurring_purchase_reminder_delivery_id" })
  id: string;

  @Column({ name: "recurring_purchase_template_id", type: "uuid" })
  templateId: string;

  @Column({ name: "period_key", type: "varchar", length: 20 })
  periodKey: string;

  @Column({ name: "due_date", type: "date" })
  dueDate: Date;

  @Column({ name: "days_before", type: "int" })
  daysBefore: number;

  @Column({ name: "sent_at", type: "timestamptz" })
  sentAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
