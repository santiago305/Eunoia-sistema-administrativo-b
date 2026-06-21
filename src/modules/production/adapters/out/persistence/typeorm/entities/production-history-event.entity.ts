import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("production_history_events")
@Index("idx_production_history_events_production", ["productionId", "createdAt"])
export class ProductionHistoryEventEntity {
  @PrimaryGeneratedColumn("uuid", { name: "production_history_event_id" })
  id: string;

  @Column({ name: "production_id", type: "uuid" })
  productionId: string;

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

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
