import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from 'users/entities/user.entity';

/**
 * Entidad `Role` que representa los diferentes roles de usuario en el sistema.
 *
 * Cada rol tiene una descripciAn Anica, un indicador de si estA eliminado lAgicamente,
 * y una relaciAn uno-a-muchos con usuarios (`User`).
 */
@Entity('roles')
export class Role {
  /**
   * Identificador Anico del rol.
   * Se genera automAticamente al insertar un nuevo registro.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * DescripciAn Anica del rol (por ejemplo: 'admin', 'user', 'moderator').
   */
  @Column({ unique: true })
  description: string;

  /**
   * Campo booleano que indica si el rol fue eliminado lAgicamente.
   * Se utiliza para soft deletes (sin borrar fAsicamente de la base de datos).
   */
  @Column({ default: false })
  deleted: boolean;

  /**
   * RelaciAn uno-a-muchos con la entidad `User`.
   * Un rol puede estar asignado a mAltiples usuarios.
   */
  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

