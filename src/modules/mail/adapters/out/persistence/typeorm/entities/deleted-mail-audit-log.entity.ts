import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('deleted_mail_audit_logs')
export class DeletedMailAuditLogEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Index('uq_deleted_mail_audit_logs_source_audit_log_id', { unique: true })
  @Column({ name: 'source_audit_log_id', type: 'uuid' })
  sourceAuditLogId: string;

  @Column({ name: 'source_message_id', type: 'uuid', nullable: true })
  sourceMessageId: string | null;

  @Column({ name: 'source_thread_id', type: 'uuid', nullable: true })
  sourceThreadId: string | null;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ name: 'action', type: 'varchar', length: 80 })
  action: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'source_created_at', type: 'timestamptz', nullable: true })
  sourceCreatedAt: Date | null;

  @CreateDateColumn({ name: 'archived_at', type: 'timestamptz' })
  archivedAt: Date;
}

