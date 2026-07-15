import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('production_attachments')
@Index('idx_production_attachments_order', ['productionId'])
export class ProductionAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'production_id', type: 'uuid' })
  productionId: string;

  @Column({ type: 'varchar', length: 40 })
  type: string;

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

