import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_equivalences')
export class ProductEquivalenceEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'equivalence_id' })
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'from_unit_id', type: 'uuid' })
  fromUnitId: string;

  @Column({ name: 'to_unit_id', type: 'uuid' })
  toUnitId: string;

  @Column({ type: 'numeric', precision: 12, scale: 6 })
  factor: number;
}
