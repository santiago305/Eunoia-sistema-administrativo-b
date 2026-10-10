import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MailAttachmentOperationStatus =
  | 'PENDING'
  | 'STAGED'
  | 'REGISTERED'
  | 'ACTIVE'
  | 'FAILED';

@Entity('mail_attachment_operations')
@Index('idx_mail_attachment_operations_status_created', ['status', 'createdAt'])
@Index('uq_mail_attachment_operations_idempotency', ['userId', 'idempotencyKey'], { unique: true })
export class MailAttachmentOperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ name: 'draft_id', type: 'uuid', nullable: true })
  draftId: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: MailAttachmentOperationStatus;

  @Column({ name: 'attachment_id', type: 'uuid', nullable: true })
  attachmentId: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, nullable: true })
  storageKey: string | null;

  @Column({ name: 'expected_size_bytes', type: 'bigint' })
  expectedSizeBytes: string;

  @Column({ name: 'actual_size_bytes', type: 'bigint', nullable: true })
  actualSizeBytes: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sha256: string | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
