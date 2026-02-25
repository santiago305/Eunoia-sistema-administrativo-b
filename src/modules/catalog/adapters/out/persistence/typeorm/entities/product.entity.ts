import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'product_id' })
  id: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text' , nullable:true})
  description?: string;

  @Column({ name: 'base_unit_id', type: 'uuid' })
  baseUnitId: string;
  
  @Column({ type: 'varchar', length: 80, unique: true })
  sku: string;
  
  @Column({ type: 'varchar', length: 80, unique: true, nullable: true })
  barcode: string | null;
  
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;
  
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cost: number;
  
  @Column({ type: 'jsonb', nullable: false, default: () => "'{}'::jsonb" })
  attributes: Record<string, unknown>;

  @Column({ name: 'type', type: 'enum', enum: ProductType, enumName: 'product_type' })
  type: ProductType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
