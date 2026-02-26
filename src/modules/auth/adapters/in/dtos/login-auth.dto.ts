import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  // IsStrongPassword
} from 'class-validator';

/**
 * DTO para la autenticacion de un usuario al hacer login.
 *
 * Esta clase valida que los datos proporcionados sean correctos antes de procesar el login.
 */
export class LoginAuthDto {
  /**
   * Correo electronico del usuario. Debe ser una direccion de correo valida.
   */
  @IsString()
  @IsEmail()
  email: string;

  /**
   * Contrasena del usuario. Debe ser una contrasena segura, validada con la regla IsStrongPassword().
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  // @IsStrongPassword()
  password: string;
}
