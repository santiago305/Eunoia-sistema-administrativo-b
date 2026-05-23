import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('deleted_mail_messages')
export class DeletedMailMessageEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Index('uq_deleted_mail_messages_source_message_id', { unique: true })
  @Column({ name: 'source_message_id', type: 'uuid' })
  sourceMessageId: string;

  @Column({ name: 'source_thread_id', type: 'uuid', nullable: true })
  sourceThreadId: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'origin_module', type: 'varchar', length: 60 })
  originModule: string;

  @Column({ name: 'kind', type: 'varchar', length: 40 })
  kind: string;

  @Column({ name: 'sender_type', type: 'varchar', length: 20 })
  senderType: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'archived_reason', type: 'varchar', length: 80, default: 'ALL_STATES_HIDDEN' })
  archivedReason: string;

  @Column({ name: 'source_created_at', type: 'timestamptz', nullable: true })
  sourceCreatedAt: Date | null;

  @Column({ name: 'source_sent_at', type: 'timestamptz', nullable: true })
  sourceSentAt: Date | null;

  @Column({ name: 'source_last_hidden_at', type: 'timestamptz', nullable: true })
  sourceLastHiddenAt: Date | null;

  @CreateDateColumn({ name: 'archived_at', type: 'timestamptz' })
  archivedAt: Date;
}

