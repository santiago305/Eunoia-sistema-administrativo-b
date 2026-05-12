import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('message_labels')
export class MessageLabelEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @Column({ name: 'key', type: 'varchar', length: 100 })
  key: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'type', type: 'varchar', length: 20 })
  type: 'SYSTEM' | 'MODULE' | 'CUSTOM';

  @Column({ name: 'color', type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({ name: 'icon', type: 'varchar', length: 80, nullable: true })
  icon: string | null;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

