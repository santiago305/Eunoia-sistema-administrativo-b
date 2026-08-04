import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @Matches(/^[\p{L}\s]+$/u, {
    message: 'La descripción solo debe contener letras y espacios',
  })
  @Length(3, 30, {
    message: 'La descripción debe tener entre 3 y 30 caracteres',
  })
  description: string;
}
