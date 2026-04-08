import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Entity('catalog_publications')
@Index('idx_catalog_publications_channel', ['channelCode'])
@Index('ux_catalog_publications_channel_item', ['channelCode', 'sourceType', 'itemId'], { unique: true })
export class CatalogPublicationEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'publication_id' })
  id: string;

  @Column({ name: 'channel_code', type: 'varchar', length: 80 })
  channelCode: string;

  @Column({ name: 'source_type', type: 'enum', enum: StockItemType, enumName: 'stock_item_type' })
  sourceType: StockItemType;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'price_override', type: 'numeric', precision: 12, scale: 2, nullable: true })
  priceOverride: number | null;

  @Column({ name: 'display_name_override', type: 'varchar', length: 255, nullable: true })
  displayNameOverride: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
