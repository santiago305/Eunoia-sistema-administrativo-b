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

  @Column({ name: 'type', type: 'enum', enum: ProductType, enumName: 'product_type', nullable: true })
  type?: ProductType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
