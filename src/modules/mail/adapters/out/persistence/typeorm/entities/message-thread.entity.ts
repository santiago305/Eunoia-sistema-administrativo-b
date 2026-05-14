import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('message_threads')
export class MessageThread {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'subject', type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'origin_module', type: 'varchar', length: 60, nullable: true })
  originModule: string | null;

  @Column({ name: 'source_entity_type', type: 'varchar', length: 80, nullable: true })
  sourceEntityType: string | null;

  @Column({ name: 'source_entity_id', type: 'uuid', nullable: true })
  sourceEntityId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_message_at', type: 'timestamp' })
  lastMessageAt: Date;
}
