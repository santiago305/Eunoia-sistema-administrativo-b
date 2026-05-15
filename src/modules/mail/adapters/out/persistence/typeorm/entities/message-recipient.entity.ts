import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('message_recipients')
export class MessageRecipientEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId: string;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255 })
  recipientEmail: string;

  @Column({ name: 'recipient_type', type: 'varchar', length: 10, default: 'TO' })
  recipientType: 'TO' | 'CC' | 'BCC';

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
