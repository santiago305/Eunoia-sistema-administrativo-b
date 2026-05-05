import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { Permission } from './permission.entity';

export type PermissionEffect = 'ALLOW' | 'DENY';

@Entity('user_permission_overrides')
@Unique('uq_user_permission_override_user_permission', ['userId', 'permissionId'])
export class UserPermissionOverride {
  @PrimaryGeneratedColumn('uuid', { name: 'user_permission_override_id' })
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'permission_id' })
  permissionId: string;

  @Column({ type: 'varchar', length: 10 })
  effect: PermissionEffect;

  @Column({ nullable: true })
  reason?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @ManyToOne(() => Permission, (permission) => permission.userPermissionOverrides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id', referencedColumnName: 'id' })
  permission: Permission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

