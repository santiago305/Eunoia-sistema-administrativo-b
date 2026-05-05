import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PurchaseProcessingApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity('purchase_processing_approvals')
@Index('idx_purchase_processing_approval_po_pending', ['poId', 'status'])
export class PurchaseProcessingApprovalEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'approval_id' })
  id: string;

  @Column({ name: 'po_id', type: 'uuid' })
  poId: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  status: PurchaseProcessingApprovalStatus;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

