import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('mail_attachment_user_refs')
@Unique('uq_mail_attachment_user_refs_attachment_user', ['attachmentId', 'userId'])
export class MailAttachmentUserRefEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'attachment_id', type: 'uuid' })
  attachmentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ name: 'counts_storage', type: 'boolean', default: true })
  countsStorage: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'permanently_deleted_at', type: 'timestamptz', nullable: true })
  permanentlyDeletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
