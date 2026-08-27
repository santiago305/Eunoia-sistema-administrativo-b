import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WorkflowStateEntity } from "./workflow-state.entity";
import { WorkflowTransitionEntity } from "./workflow-transition.entity";
import {
  WORKFLOW_LIFECYCLE,
  WorkflowLifecycleStatus,
} from '../../../../../domain/constants/workflow-lifecycle.constants';

@Entity("workflows")
export class WorkflowEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ name: "normalized_name", type: "varchar", length: 150 })
  normalizedName: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive: boolean;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ type: 'int', default: 1 })
  revision: number;

  @Column({
    name: 'lifecycle_status',
    type: 'varchar',
    length: 20,
    default: WORKFLOW_LIFECYCLE.PUBLISHED,
  })
  lifecycleStatus: WorkflowLifecycleStatus;

  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ name: 'based_on_workflow_id', type: 'uuid', nullable: true })
  basedOnWorkflowId?: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt?: Date | null;

  @OneToMany(() => WorkflowStateEntity, (state) => state.workflow)
  states?: WorkflowStateEntity[];

  @OneToMany(() => WorkflowTransitionEntity, (transition) => transition.workflow)
  transitions?: WorkflowTransitionEntity[];
}
