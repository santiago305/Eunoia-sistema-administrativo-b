import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('stock_item_products')
@Index('idx_sip_product', ['productId'])
export class StockItemProductEntity {
  @PrimaryColumn({ name: 'stock_item_id', type: 'uuid' })
  stockItemId: string;

  @Column({ name: 'product_id', type: 'uuid', unique: true })
  productId: string;
}
