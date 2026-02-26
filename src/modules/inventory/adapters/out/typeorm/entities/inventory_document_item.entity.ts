import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventory_document_items')
export class InventoryDocumentItemEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'item_id' })
  id: string;

  @Column({ name: 'doc_id', type: 'uuid' })
  docId: string;

  @Column({ name: 'stock_item_id', type: 'uuid' })
  stockItemId: string;

  @Column({ name: 'from_location_id', type: 'uuid', nullable: true })
  fromLocationId?: string;

  @Column({ name: 'to_location_id', type: 'uuid', nullable: true })
  toLocationId?: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'numeric', nullable: true })
  unitCost?: number | null;
}

