import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';

export type NotificationRecipientStatus = 'UNREAD' | 'SEEN' | 'READ' | 'ARCHIVED' | 'DISMISSED' | 'DELETED';

@Entity('notification_recipients')
export class NotificationRecipient {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => Notification, (notification) => notification.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser: User;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'UNREAD' })
  status: NotificationRecipientStatus;

  @Column({ name: 'seen_at', type: 'timestamp', nullable: true })
  seenAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamp', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
