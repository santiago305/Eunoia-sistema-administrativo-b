import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../../../../roles/adapters/out/persistence/typeorm/entities/role.entity';

/**
 * Entidad que representa a un usuario del sistema.
 * Se mapea a la tabla 'users' en la base de datos.
 */
@Entity('users')
export class User {
  /**
   * Identificador unico del usuario.
   */
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  id: string

  /**
   * Nombre del usuario.
   */
  @Column()
  name: string;

  /**
   * Correo electrИnico del usuario (Anico).
   */
  @Column({ unique: true })
  email: string;

  /**
   * Contraseヵa hasheada del usuario.
   */
  @Column()
  password: string;

  /**
   * Indica si el usuario ha sido eliminado logicamente.
   */
  @Column({ default: false })
  deleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'is_super_admin', default: false })
  isSuperAdmin: boolean;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ name: 'telefono', type: 'varchar', length: 30, nullable: true })
  telefono?: string;

  @Column({ name: 'preferred_home_path', type: 'varchar', length: 255, nullable: true })
  preferredHomePath?: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @Column({ name: 'manageable_role_descriptions', type: 'text', array: true, nullable: true })
  manageableRoleDescriptions?: string[] | null;

  @Column({ name: 'manageable_user_ids', type: 'uuid', array: true, nullable: true })
  manageableUserIds?: string[] | null;


  /**
   * Rol asignado al usuario.
   */
  @ManyToOne(() => Role, (role) => role.users, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'lockout_level', type: 'int', default: 0 })
  lockoutLevel: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'security_disabled_at', type: 'timestamp', nullable: true })
  securityDisabledAt: Date | null;
}
