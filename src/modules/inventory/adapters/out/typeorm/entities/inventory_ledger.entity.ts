import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Direction } from 'src/modules/inventory/domain/value-objects/direction';
import { WarehouseEntity } from 'src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
import { StockItemEntity } from 'src/modules/inventory/adapters/out/typeorm/entities/stock-item.entity';
import { InventoryDocumentEntity } from 'src/modules/inventory/adapters/out/typeorm/entities/inventory_document.entity';

@Entity('inventory_ledger')
export class InventoryLedgerEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'ledger_id' })
  id: string;

  @Column({ name: 'doc_id', type: 'uuid' })
  docId: string;

  @ManyToOne(() => InventoryDocumentEntity, { nullable: false })
  @JoinColumn({ name: 'doc_id' })
  document: InventoryDocumentEntity;

  @Column({ name: 'doc_item_id', type: 'uuid', nullable: true })
  docItemId?: string | null;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => WarehouseEntity, { nullable: false })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: WarehouseEntity;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId?: string;

  @Column({ name: 'stock_item_id', type: 'uuid' })
  stockItemId: string;

  @ManyToOne(() => StockItemEntity, { nullable: false })
  @JoinColumn({ name: 'stock_item_id' })
  stockItem: StockItemEntity;

  @Column({ name: 'direction', type: 'enum', enum: Direction, enumName: 'inv_direction' })
  direction: Direction;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'waste_qty', type: 'numeric', precision: 12, scale: 6, default: 0 })
  wasteQty?: number | null;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2, nullable: true })
  unitCost?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

