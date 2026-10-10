import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('deleted_mail_archive_operations')
export class DeletedMailArchiveOperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_message_id', type: 'uuid' })
  sourceMessageId: string;

  @Column({ name: 'source_attachment_id', type: 'uuid' })
  sourceAttachmentId: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'original_storage_key', type: 'varchar', length: 500 })
  originalStorageKey: string;

  @Column({ name: 'final_storage_key', type: 'varchar', length: 500, nullable: true })
  finalStorageKey: string | null;

  @Column({ name: 'expected_size_bytes', type: 'bigint', nullable: true })
  expectedSizeBytes: string | null;

  @Column({ name: 'actual_size_bytes', type: 'bigint', nullable: true })
  actualSizeBytes: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sha256: string | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
