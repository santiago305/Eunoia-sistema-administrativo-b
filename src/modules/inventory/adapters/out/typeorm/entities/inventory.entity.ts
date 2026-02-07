import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory')
export class InventoryEntity {
  @PrimaryColumn({ name: 'warehouse_id', type: 'uuid' })
    warehouseId: string;

    @PrimaryColumn({ name: 'variant_id', type: 'uuid' })
    variantId: string;

    @Column({ name: 'location_id', type: 'uuid', nullable: true })
    locationId?: string;


  @Column({ name: 'on_hand', type: 'int', default: 0 })
  onHand: number;

  @Column({ name: 'reserved', type: 'int', default: 0 })
  reserved: number;

  @Column({ name: 'available', type: 'int', nullable: true })
  available: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
