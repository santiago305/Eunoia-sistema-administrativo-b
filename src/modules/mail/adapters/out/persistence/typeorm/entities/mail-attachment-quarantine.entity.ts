import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MailAttachmentQuarantineStatus = 'CANDIDATE' | 'QUARANTINED' | 'RESTORED' | 'PURGED';

@Entity('mail_attachment_quarantines')
@Index('idx_mail_attachment_quarantines_status_created', ['status', 'createdAt'])
export class MailAttachmentQuarantineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId: string;

  @Column({ name: 'attachment_id', type: 'uuid', nullable: true })
  attachmentId: string | null;

  @Column({ name: 'original_key', type: 'varchar', length: 500 })
  originalKey: string;

  @Column({ name: 'quarantine_key', type: 'varchar', length: 500 })
  quarantineKey: string;

  @Column({ type: 'varchar', length: 64 })
  sha256: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'varchar', length: 20 })
  status: MailAttachmentQuarantineStatus;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId: string | null;

  @Column({ name: 'restored_at', type: 'timestamptz', nullable: true })
  restoredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
