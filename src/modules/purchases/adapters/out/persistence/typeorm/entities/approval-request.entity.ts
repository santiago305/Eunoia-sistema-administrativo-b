import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

@Entity("approval_requests")
@Index("idx_approval_requests_entity", ["entityType", "entityId"])
@Index("idx_approval_requests_status", ["status"])
export class ApprovalRequestEntity {
  @PrimaryGeneratedColumn("uuid", { name: "approval_request_id" })
  id: string;

  @Column({ name: "module", type: "varchar", length: 80 })
  module: string;

  @Column({ name: "action", type: "varchar", length: 120 })
  action: string;

  @Column({ name: "entity_type", type: "varchar", length: 80 })
  entityType: string;

  @Column({ name: "entity_id", type: "uuid" })
  entityId: string;

  @Column({ name: "requested_by_user_id", type: "uuid" })
  requestedByUserId: string;

  @Column({ name: "reviewed_by_user_id", type: "uuid", nullable: true })
  reviewedByUserId?: string | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "PENDING" })
  status: ApprovalRequestStatus;

  @Column({ name: "payload_snapshot", type: "jsonb", default: () => "'{}'" })
  payloadSnapshot: Record<string, unknown>;

  @Column({ name: "reason", type: "text", nullable: true })
  reason?: string | null;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}

