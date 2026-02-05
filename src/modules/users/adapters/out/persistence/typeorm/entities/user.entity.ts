import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
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
  @PrimaryGeneratedColumn('uuid')
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

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;


  /**
   * Rol asignado al usuario.
   */
  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'lockout_level', type: 'int', default: 0 })
  lockoutLevel: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'security_disabled_at', type: 'timestamp', nullable: true })
  securityDisabledAt: Date | null;
}
