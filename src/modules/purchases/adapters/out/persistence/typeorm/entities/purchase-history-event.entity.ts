import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("purchase_history_events")
@Index("idx_purchase_history_events_purchase", ["purchaseId", "createdAt"])
export class PurchaseHistoryEventEntity {
  @PrimaryGeneratedColumn("uuid", { name: "purchase_history_event_id" })
  id: string;

  @Column({ name: "purchase_id", type: "uuid" })
  purchaseId: string;

  @Column({ name: "event_type", type: "varchar", length: 120 })
  eventType: string;

  @Column({ name: "description", type: "text" })
  description: string;

  @Column({ name: "old_values", type: "jsonb", nullable: true })
  oldValues?: Record<string, unknown> | null;

  @Column({ name: "new_values", type: "jsonb", nullable: true })
  newValues?: Record<string, unknown> | null;

  @Column({ name: "metadata", type: "jsonb", default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @Column({ name: "performed_by_user_id", type: "uuid", nullable: true })
  performedByUserId?: string | null;

  @Column({ name: "target_user_id", type: "uuid", nullable: true })
  targetUserId?: string | null;

  @Column({ name: "approval_request_id", type: "uuid", nullable: true })
  approvalRequestId?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

