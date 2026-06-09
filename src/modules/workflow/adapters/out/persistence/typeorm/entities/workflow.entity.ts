import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { WorkflowStateEntity } from "./workflow-state.entity";
import { WorkflowTransitionEntity } from "./workflow-transition.entity";

@Entity("workflows")
export class WorkflowEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ name: "normalized_name", type: "varchar", length: 150, unique: true })
  normalizedName: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt?: Date | null;

  @OneToMany(() => WorkflowStateEntity, (state) => state.workflow)
  states?: WorkflowStateEntity[];

  @OneToMany(() => WorkflowTransitionEntity, (transition) => transition.workflow)
  transitions?: WorkflowTransitionEntity[];
}
