import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';
import { ProductEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product-variant.entity';

@Entity('stock_items')
@Index('idx_stock_items_type', ['type'])
@Index('ux_stock_items_product', ['productId'], { unique: true })
@Index('ux_stock_items_variant', ['variantId'], { unique: true })
@Check(
  'chk_stock_items_type_ref',
  "(type = 'PRODUCT' and product_id is not null and variant_id is null) or (type = 'VARIANT' and variant_id is not null and product_id is null)",
)
export class StockItemEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'stock_item_id' })
  id: string;

  @Column({ name: 'type', type: 'enum', enum: StockItemType, enumName: 'stock_item_type' })
  type: StockItemType;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string | null;

  @ManyToOne(() => ProductEntity, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity | null;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId?: string | null;

  @ManyToOne(() => ProductVariantEntity, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariantEntity | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
