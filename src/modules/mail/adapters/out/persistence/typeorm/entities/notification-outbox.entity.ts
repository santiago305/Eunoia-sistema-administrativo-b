import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';

export type NotificationOutboxStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

@Entity('notification_outbox')
export class NotificationOutbox {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => NotificationRecipient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_recipient_id' })
  notificationRecipient: NotificationRecipient;

  @Column({ name: 'event_type', type: 'varchar', length: 80 })
  eventType: string;

  @Column({ name: 'payload', type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  status: NotificationOutboxStatus;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
