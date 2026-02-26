import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sku_counters')
export class SkuCounterEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sku_id' })
  id: string;

  @Column({ name: 'last_number', type: 'integer', default: 0 })
  lastNumber: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

