import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('deleted_mail_message_user_states')
export class DeletedMailMessageUserStateEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Index('uq_deleted_mail_message_user_states_source_state_id', { unique: true })
  @Column({ name: 'source_state_id', type: 'uuid' })
  sourceStateId: string;

  @Column({ name: 'source_message_id', type: 'uuid' })
  sourceMessageId: string;

  @Column({ name: 'source_user_id', type: 'uuid' })
  sourceUserId: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 20 })
  relationType: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'source_permanently_hidden_at', type: 'timestamptz', nullable: true })
  sourcePermanentlyHiddenAt: Date | null;

  @CreateDateColumn({ name: 'archived_at', type: 'timestamptz' })
  archivedAt: Date;
}

