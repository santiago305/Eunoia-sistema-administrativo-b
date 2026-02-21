import { ProductVariantAttributes } from 'src/modules/catalog/application/dto/product-variants/input/attributes-product-variant';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('product_variants')
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'variant_id' })
  id: string;
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;
  @Column({ type: 'varchar', length: 80, unique: true })
  sku: string;
  @Column({ type: 'varchar', length: 80, unique: true, nullable: true })
  barcode: string | null;
  @Column({ type: 'jsonb', nullable: false, default: () => "'{}'::jsonb" })
  attributes: ProductVariantAttributes;
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  cost: number | null;
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
