import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';

export type NotificationDeliveryChannel = 'IN_APP' | 'WEBSOCKET' | 'EMAIL' | 'PUSH' | 'WHATSAPP';
export type NotificationDeliveryStatus = 'SUCCESS' | 'FAILED';

@Entity('notification_delivery_attempts')
export class NotificationDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => NotificationRecipient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_recipient_id' })
  notificationRecipient: NotificationRecipient;

  @Column({ name: 'channel', type: 'varchar', length: 20 })
  channel: NotificationDeliveryChannel;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: NotificationDeliveryStatus;

  @Column({ name: 'attempt_number', type: 'int' })
  attemptNumber: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'provider_response', type: 'jsonb', default: () => "'{}'" })
  providerResponse: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
