import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MailMessageActionStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

@Entity('mail_message_actions')
export class MessageActionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId: string;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ name: 'action_key', type: 'varchar', length: 160 })
  actionKey: string;

  @Column({ name: 'action_type', type: 'varchar', length: 80 })
  actionType: string;

  @Column({ name: 'target_entity_type', type: 'varchar', length: 80 })
  targetEntityType: string;

  @Column({ name: 'target_entity_id', type: 'varchar', length: 120 })
  targetEntityId: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  status: MailMessageActionStatus;

  @Column({ name: 'completed_by_user_id', type: 'uuid', nullable: true })
  completedByUserId: string | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'version', type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
