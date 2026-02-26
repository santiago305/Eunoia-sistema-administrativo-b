import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Entity('stock_items')
@Index('idx_stock_items_type', ['type'])
export class StockItemEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'stock_item_id' })
  id: string;

  @Column({ name: 'type', type: 'enum', enum: StockItemType, enumName: 'stock_item_type' })
  type: StockItemType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
