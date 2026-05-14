import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('message_search_history')
export class MessageSearchHistoryEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'query', type: 'varchar', length: 255 })
  query: string;

  @Column({ name: 'used_count', type: 'int', default: 1 })
  usedCount: number;

  @Column({ name: 'last_used_at', type: 'timestamp' })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
