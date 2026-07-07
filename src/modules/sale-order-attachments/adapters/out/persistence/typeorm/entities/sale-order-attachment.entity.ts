import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SaleOrderAttachmentType } from 'src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type';

@Entity('sale_order_attachments')
@Index('idx_sale_order_attachments_order', ['saleOrderId'])
@Index('idx_sale_order_attachments_payment', ['saleOrderPaymentId'])
export class SaleOrderAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_order_id', type: 'uuid' })
  saleOrderId: string;

  @Column({ name: 'sale_order_payment_id', type: 'uuid', nullable: true })
  saleOrderPaymentId?: string | null;

  @Column({ type: 'varchar', length: 40 })
  type: SaleOrderAttachmentType;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ name: 'original_name', type: 'varchar' })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ name: 'storage_path', type: 'varchar' })
  storagePath: string;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid', nullable: true })
  uploadedByUserId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
