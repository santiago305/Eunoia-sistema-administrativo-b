import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('advisers')
export class AdviserEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
