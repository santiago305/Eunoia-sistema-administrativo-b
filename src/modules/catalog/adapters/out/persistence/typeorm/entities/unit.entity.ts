import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('units')
export class UnitEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'unit_id' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;
}
