import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { Permission } from './permission.entity';

@Entity('user_grantable_permissions')
@Unique('uq_user_grantable_permission_user_permission', ['managerUserId', 'permissionId'])
export class UserGrantablePermission {
  @PrimaryGeneratedColumn('uuid', { name: 'user_grantable_permission_id' })
  id: string;

  @Column({ name: 'manager_user_id' })
  managerUserId: string;

  @Column({ name: 'permission_id' })
  permissionId: string;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'manager_user_id', referencedColumnName: 'id' })
  managerUser: User;

  @ManyToOne(() => Permission, (permission) => permission.userGrantablePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id', referencedColumnName: 'id' })
  permission: Permission;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id', referencedColumnName: 'id' })
  createdByUser?: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
