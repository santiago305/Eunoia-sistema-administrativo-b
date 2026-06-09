import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sale_order_state_history")
export class SaleOrderStateHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "sale_order_id", type: "uuid" })
  saleOrderId: string;

  @Column({ name: "workflow_id", type: "uuid" })
  workflowId: string;

  @Column({ name: "transition_id", type: "uuid", nullable: true })
  transitionId?: string | null;

  @Column({ name: "from_state_id", type: "uuid", nullable: true })
  fromStateId?: string | null;

  @Column({ name: "to_state_id", type: "uuid" })
  toStateId: string;

  @Column({ name: "executed_by", type: "uuid" })
  executedBy: string;

  @CreateDateColumn({ name: "executed_at", type: "timestamptz" })
  executedAt: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown> | null;
}
