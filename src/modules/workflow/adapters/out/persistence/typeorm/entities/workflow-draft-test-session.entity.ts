import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SaleOrderStockStatus } from 'src/modules/sale-orders/application/services/sale-order-edit-policy.service';

export const WORKFLOW_TEST_STATUS = {
  ACTIVE: 'ACTIVE',
  REVERTED: 'REVERTED',
} as const;

export type WorkflowTestStatus =
  (typeof WORKFLOW_TEST_STATUS)[keyof typeof WORKFLOW_TEST_STATUS];

@Entity('workflow_draft_test_sessions')
export class WorkflowDraftTestSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'draft_workflow_id', type: 'uuid' })
  draftWorkflowId: string;

  @Column({ name: 'sale_order_id', type: 'uuid' })
  saleOrderId: string;

  @Column({ name: 'original_workflow_id', type: 'uuid', nullable: true })
  originalWorkflowId?: string | null;

  @Column({ name: 'original_state_id', type: 'uuid', nullable: true })
  originalStateId?: string | null;

  @Column({ name: 'original_stock_status', type: 'varchar', length: 20 })
  originalStockStatus: SaleOrderStockStatus;

  @Column({ name: 'original_warehouse_id', type: 'uuid', nullable: true })
  originalWarehouseId?: string | null;

  @Column({ name: 'original_invoice_send', type: 'boolean' })
  originalInvoiceSend: boolean;

  @Column({ name: 'original_prepared', type: 'boolean' })
  originalPrepared: boolean;

  @Column({ name: 'original_preguide', type: 'boolean' })
  originalPreguide: boolean;

  @Column({ name: 'original_reserve_bool', type: 'boolean' })
  originalReserveBool: boolean;

  @Column({ name: 'original_stock_reverted_bool', type: 'boolean' })
  originalStockRevertedBool: boolean;

  @Column({ type: 'varchar', length: 20, default: WORKFLOW_TEST_STATUS.ACTIVE })
  status: WorkflowTestStatus;

  @Column({ name: 'started_by', type: 'uuid' })
  startedBy: string;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'reverted_by', type: 'uuid', nullable: true })
  revertedBy?: string | null;

  @Column({ name: 'reverted_at', type: 'timestamptz', nullable: true })
  revertedAt?: Date | null;
}
