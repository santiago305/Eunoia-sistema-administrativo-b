import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { UserPermissionOverride } from './user-permission-override.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid', { name: 'permission_id' })
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  module?: string;

  @Column({ nullable: true })
  resource?: string;

  @Column({ nullable: true })
  action?: string;

  @Column({ default: 'action' })
  type: 'action' | 'page';

  @Column({ name: 'is_system', default: true })
  isSystem: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
  rolePermissions: RolePermission[];

  @OneToMany(() => UserPermissionOverride, (override) => override.permission)
  userPermissionOverrides: UserPermissionOverride[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

