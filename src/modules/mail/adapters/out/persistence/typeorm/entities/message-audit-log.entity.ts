import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('message_audit_logs')
export class MessageAuditLogEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ name: 'thread_id', type: 'uuid', nullable: true })
  threadId: string | null;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ name: 'action', type: 'varchar', length: 80 })
  action: string;

  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
