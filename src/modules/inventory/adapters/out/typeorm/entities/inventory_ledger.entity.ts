import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Direction } from 'src/modules/inventory/domain/value-objects/direction';

@Entity('inventory_ledger')
export class InventoryLedgerEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'serie_id' })
  id: string;

  @Column({ name: 'doc_id', type: 'uuid' })
  docId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId?: string;

  @Column({ name: 'stock_item_id', type: 'uuid' })
  stockItemId: string;

  @Column({ name: 'direction', type: 'enum', enum: Direction, enumName: 'inv_direction' })
  direction: Direction;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'numeric', nullable: true })
  unitCost?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

