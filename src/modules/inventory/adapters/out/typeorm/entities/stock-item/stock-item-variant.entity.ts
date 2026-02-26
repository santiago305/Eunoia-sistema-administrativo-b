import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('stock_item_variants')
@Index('idx_siv_variant', ['variantId'])
export class StockItemVariantEntity {
  @PrimaryColumn({ name: 'stock_item_id', type: 'uuid' })
  stockItemId: string;

  @Column({ name: 'variant_id', type: 'uuid', unique: true })
  variantId: string;
}
