import { ProductVariantAttributes } from 'src/modules/catalag/application/dto/product-variants/input/attributes-product-variant';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('product_variants')
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar' ,unique: true })
  sku: string;

  @Column({ type: 'varchar' ,unique: true })
  barcode: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes?: ProductVariantAttributes;

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'numeric' })
  cost: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
