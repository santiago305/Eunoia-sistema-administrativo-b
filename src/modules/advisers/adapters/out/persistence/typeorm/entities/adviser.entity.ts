import { Entity, PrimaryColumn } from 'typeorm';

@Entity('advisers')
export class AdviserEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;
}
