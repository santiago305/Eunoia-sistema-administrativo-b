import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";

@Entity("purchase_attachments")
@Index("idx_purchase_attachments_purchase", ["purchaseId", "deletedAt"])
@Index("idx_purchase_attachments_payment", ["paymentId", "deletedAt"])
@Index("idx_purchase_attachments_reception", ["receptionId", "deletedAt"])
@Index("idx_purchase_attachments_type", ["type"])
export class PurchaseAttachmentEntity {
  @PrimaryGeneratedColumn("uuid", { name: "purchase_attachment_id" })
  id: string;

  @Column({ name: "purchase_id", type: "uuid" })
  purchaseId: string;

  @ManyToOne(() => PurchaseOrderEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "purchase_id" })
  purchase?: PurchaseOrderEntity;

  @Column({ name: "payment_id", type: "uuid", nullable: true })
  paymentId?: string | null;

  @ManyToOne(() => PaymentDocumentEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "payment_id" })
  payment?: PaymentDocumentEntity | null;

  @Column({ name: "reception_id", type: "uuid", nullable: true })
  receptionId?: string | null;

  @Column({ name: "type", type: "enum", enum: PurchaseAttachmentType, enumName: "purchase_attachment_type" })
  type: PurchaseAttachmentType;

  @Column({ name: "filename", type: "varchar", length: 255 })
  filename: string;

  @Column({ name: "original_name", type: "varchar", length: 255 })
  originalName: string;

  @Column({ name: "mime_type", type: "varchar", length: 120 })
  mimeType: string;

  @Column({ name: "size_bytes", type: "integer" })
  sizeBytes: number;

  @Column({ name: "url", type: "varchar", length: 700 })
  url: string;

  @Column({ name: "storage_path", type: "varchar", length: 700 })
  storagePath: string;

  @Column({ name: "note", type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "uploaded_by_user_id", type: "uuid", nullable: true })
  uploadedByUserId?: string | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

