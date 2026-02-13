import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WarehouseEntity } from './warehouse';

@Entity('warehouse_locations')
@Index(['warehouseId', 'code'], { unique: true })
export class WarehouseLocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => WarehouseEntity, (warehouse) => warehouse.locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: WarehouseEntity;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
