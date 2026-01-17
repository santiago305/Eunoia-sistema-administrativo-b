import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO para la creaciAn de un nuevo usuario.
 * Contiene las validaciones necesarias para asegurar la integridad de los datos.
 */
export class CreateUserDto {
  /**
   * Nombre del usuario.
   * Debe ser una cadena no vacAa.
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Correo electrAnico del usuario.
   * Debe ser un email vAlido.
   */
  @IsEmail()
  email: string;

  /**
   * ContraseAa del usuario.
   * Debe ser una cadena no vacAa. Se almacenarA de forma encriptada.
   */
  @IsString()
  @IsNotEmpty()
  password: string;

  /**
   * ID del rol asignado al usuario.
   * No es obligatorio.
   */
  @IsOptional()
  @IsNotEmpty()
  roleId?: string;

  /**URL de la imagen del usuario (opcional) */
  @IsOptional()
  @IsString()
  avatarUrl?: string;

}

