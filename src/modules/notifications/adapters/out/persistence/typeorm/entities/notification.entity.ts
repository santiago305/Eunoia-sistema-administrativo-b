import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'type', type: 'varchar', length: 80 })
  type: string;

  @Column({ name: 'category', type: 'varchar', length: 80 })
  category: string;

  @Column({ name: 'title', type: 'varchar', length: 180 })
  title: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'priority', type: 'varchar', length: 20, default: 'NORMAL' })
  priority: NotificationPriority;

  @Column({ name: 'source_module', type: 'varchar', length: 60, nullable: true })
  sourceModule: string | null;

  @Column({ name: 'source_entity_type', type: 'varchar', length: 60, nullable: true })
  sourceEntityType: string | null;

  @Column({ name: 'source_entity_id', type: 'varchar', length: 120, nullable: true })
  sourceEntityId: string | null;

  @Column({ name: 'action_url', type: 'varchar', length: 255, nullable: true })
  actionUrl: string | null;

  @Column({ name: 'action_label', type: 'varchar', length: 120, nullable: true })
  actionLabel: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'show_as_toast', type: 'boolean', default: true })
  showAsToast: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.notification)
  recipients: NotificationRecipient[];
}
