import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('workflow_action_executions')
export class WorkflowActionExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_order_id', type: 'uuid' })
  saleOrderId: string;

  @Column({ name: 'transition_id', type: 'uuid', nullable: true })
  transitionId: string | null;

  @Column({ name: 'action_id', type: 'uuid', nullable: true })
  actionId: string | null;

  @Column({ name: 'action_type', type: 'varchar', length: 80 })
  actionType: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 20 })
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

  @Column({ type: 'integer', default: 1 })
  attempts: number;

  @Column({ type: 'jsonb', nullable: true })
  evidence: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  error: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
