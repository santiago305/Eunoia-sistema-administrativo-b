import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Role } from 'src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from './user.entity';

@Entity('user_manageable_roles')
@Unique('uq_user_manageable_roles_manager_role', ['managerUserId', 'roleId'])
export class UserManageableRole {
  @PrimaryGeneratedColumn('uuid', { name: 'user_manageable_role_id' })
  id: string;

  @Column({ name: 'manager_user_id', type: 'uuid' })
  managerUserId: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'manager_user_id', referencedColumnName: 'id' })
  managerUser: User;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'roleId' })
  role: Role;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id', referencedColumnName: 'id' })
  createdByUser?: User | null;
}
