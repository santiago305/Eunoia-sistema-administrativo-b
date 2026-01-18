import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// DTO para cambio de contrasena con validacion basica
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
