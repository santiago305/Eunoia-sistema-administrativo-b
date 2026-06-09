import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WorkflowEntity } from "./workflow.entity";
import { SaleOrderStatesEntity } from "./sale-order-states.entity";

@Entity("workflow_states")
export class WorkflowStateEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "workflow_id", type: "uuid" })
  workflowId: string;

  @Column({ name: "sale_order_state_id", type: "uuid" })
  saleOrderStateId: string;

  @Column({ type: "int", default: 0 })
  position: number;

  @Column({ name: "position_x", type: "double precision", nullable: true })
  positionX: number | null;

  @Column({ name: "position_y", type: "double precision", nullable: true })
  positionY: number | null;

  @Column({ name: "is_initial", type: "boolean", default: false })
  isInitial: boolean;

  @Column({ name: "is_final", type: "boolean", default: false })
  isFinal: boolean;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt?: Date | null;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.states, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "workflow_id" })
  workflow?: WorkflowEntity;

  @ManyToOne(() => SaleOrderStatesEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "sale_order_state_id" })
  saleOrderState?: SaleOrderStatesEntity;
}
