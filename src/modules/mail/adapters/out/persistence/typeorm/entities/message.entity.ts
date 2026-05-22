import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { MessageStatus } from '../../../../../domain/enums/message-status.enum';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'thread_id', type: 'uuid', nullable: true })
  threadId: string | null;

  @Column({ name: 'parent_message_id', type: 'uuid', nullable: true })
  parentMessageId: string | null;

  @Column({ name: 'kind', type: 'varchar', length: 40 })
  kind: 'SYSTEM_NOTIFICATION' | 'USER_MESSAGE' | 'SYSTEM_MESSAGE';

  @Column({ name: 'origin_module', type: 'varchar', length: 60 })
  originModule: string;

  @Column({ name: 'source_entity_type', type: 'varchar', length: 80, nullable: true })
  sourceEntityType: string | null;

  @Column({ name: 'source_entity_id', type: 'uuid', nullable: true })
  sourceEntityId: string | null;

  @Column({ name: 'sender_type', type: 'varchar', length: 20 })
  senderType: 'USER' | 'SYSTEM';

  @Column({ name: 'sender_user_id', type: 'uuid', nullable: true })
  senderUserId: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'subject', type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ name: 'body_text', type: 'text' })
  bodyText: string;

  @Column({ name: 'body_json', type: 'jsonb', nullable: true })
  bodyJson: Record<string, unknown> | null;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: MessageStatus;

  @Column({ name: 'is_draft', type: 'boolean', default: false })
  isDraft: boolean;

  @Column({ name: 'draft_expires_at', type: 'timestamp', nullable: true })
  draftExpiresAt: Date | null;

  @Column({ name: 'last_autosaved_at', type: 'timestamp', nullable: true })
  lastAutosavedAt: Date | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
