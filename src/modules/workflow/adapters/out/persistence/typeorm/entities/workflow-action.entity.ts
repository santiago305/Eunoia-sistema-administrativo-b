import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WorkflowActionType } from "src/modules/workflow/domain/entities/workflow-action";
import { WorkflowTransitionEntity } from "./workflow-transition.entity";

@Entity("workflow_actions")
export class WorkflowActionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "transition_id", type: "uuid" })
  transitionId: string;

  @Column({ type: "varchar", length: 50 })
  type: WorkflowActionType;

  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  config: Record<string, unknown>;

  @Column({ type: "int", default: 0 })
  position: number;

  @Column({ type: "varchar", length: 10, default: "THEN" })
  branch: "THEN" | "ELSE";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt?: Date | null;

  @ManyToOne(() => WorkflowTransitionEntity, (transition) => transition.actions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "transition_id" })
  transition?: WorkflowTransitionEntity;
}
