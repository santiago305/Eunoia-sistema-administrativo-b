import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Role } from 'src/modules/roles/infrastructure/orm-entities/role.entity';

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
   * Correo electrónico del usuario (Anico).
   */
  @Column({ unique: true })
  email: string;

  /**
   * Contraseña hasheada del usuario.
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
}

