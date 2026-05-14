import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('message_user_states')
export class MessageUserStateEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'thread_id', type: 'uuid', nullable: true })
  threadId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 20 })
  relationType: 'SENDER' | 'TO' | 'CC' | 'BCC' | 'SYSTEM_RECIPIENT';

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail: string | null;

  @Column({ name: 'is_in_inbox', type: 'boolean', default: false })
  isInInbox: boolean;

  @Column({ name: 'is_in_sent', type: 'boolean', default: false })
  isInSent: boolean;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'is_muted', type: 'boolean', default: false })
  isMuted: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ name: 'starred_at', type: 'timestamp', nullable: true })
  starredAt: Date | null;

  @Column({ name: 'snoozed_until', type: 'timestamp', nullable: true })
  snoozedUntil: Date | null;

  @Column({ name: 'snoozed_at', type: 'timestamp', nullable: true })
  snoozedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'trash_expires_at', type: 'timestamp', nullable: true })
  trashExpiresAt: Date | null;

  @Column({ name: 'permanently_hidden_at', type: 'timestamp', nullable: true })
  permanentlyHiddenAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
