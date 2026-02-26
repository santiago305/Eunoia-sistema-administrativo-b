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
  @IsString({ message: 'El email debe ser una cadena de texto' })
  @IsEmail({}, { message: 'El email debe tener un formato valido' })
  email: string;

  /**
   * Contrasena del usuario. Debe ser una contrasena segura, validada con la regla IsStrongPassword().
   */
  @IsString({ message: 'La contrasena debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contrasena no puede estar vacia' })
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  // @IsStrongPassword()
  password: string;
}
