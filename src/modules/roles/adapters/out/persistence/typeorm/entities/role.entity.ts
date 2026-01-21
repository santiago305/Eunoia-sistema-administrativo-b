import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';

@Entity('roles')
export class Role {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  description: string;

  @Column({ default: false })
  deleted: boolean;
  
  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

