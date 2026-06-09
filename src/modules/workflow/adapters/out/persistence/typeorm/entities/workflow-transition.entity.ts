import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WorkflowEntity } from "./workflow.entity";
import { WorkflowConditionEntity } from "./workflow-condition.entity";
import { WorkflowActionEntity } from "./workflow-action.entity";
import { WorkflowTransitionPurpose } from "src/modules/workflow/domain/constants/workflow-transition-purpose.constants";
import { WorkflowTransitionEffect } from "src/modules/workflow/domain/constants/workflow-transition-effect.constants";

@Entity("workflow_transitions")
export class WorkflowTransitionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "workflow_id", type: "uuid" })
  workflowId: string;

  @Column({ type: "varchar", length: 100 })
  code: string;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ type: "varchar", length: 20, default: "MOVE_STATE" })
  effect: WorkflowTransitionEffect;

  @Column({ type: "varchar", length: 20, default: "STANDARD" })
  purpose: WorkflowTransitionPurpose;

  @Column({ name: "from_state_id", type: "uuid", nullable: true })
  fromStateId?: string | null;

  @Column({ name: "to_state_id", type: "uuid", nullable: true })
  toStateId?: string | null;

  @Column({ name: "is_global", type: "boolean", default: false })
  isGlobal: boolean;

  @Column({ name: "excluded_state_ids", type: "uuid", array: true, default: "{}" })
  excludedStateIds: string[];

  @Column({ name: "source_handle", type: "varchar", nullable: true })
  sourceHandle?: string | null;

  @Column({ name: "target_handle", type: "varchar", nullable: true })
  targetHandle?: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt?: Date | null;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.transitions, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "workflow_id" })
  workflow?: WorkflowEntity;

  @OneToMany(() => WorkflowConditionEntity, (condition) => condition.transition)
  conditions?: WorkflowConditionEntity[];

  @OneToMany(() => WorkflowActionEntity, (action) => action.transition)
  actions?: WorkflowActionEntity[];
}
