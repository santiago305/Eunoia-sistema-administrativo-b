import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { DocStatus } from 'src/modules/inventory/domain/value-objects/doc-status';


@Entity('inventory_documents')
export class InventoryDocumentEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'doc_id' })
  id: string;

  @Column({ name: 'doc_type', type: 'enum', enum: DocType, enumName: 'inv_doc_type' })
  docType: DocType;

  @Column({ name: 'status', type: 'enum', enum: DocStatus, enumName: 'inv_doc_status', default: DocStatus.DRAFT })
  status: DocStatus;

  @Column({ name: 'serie_id', type: 'uuid' })
  serieId: string;

  @Column({ name: 'correlative', type: 'int', nullable: true })
  correlative?: number;


  @Column({ name: 'from_warehouse_id', type: 'uuid', nullable: true })
  fromWarehouseId?: string;

  @Column({ name: 'to_warehouse_id', type: 'uuid', nullable: true })
  toWarehouseId?: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;

  @Column({ name: 'reference_type', type: 'varchar', nullable: true })
  referenceType?: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedBy?: string;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
