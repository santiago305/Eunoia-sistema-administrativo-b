import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * DTO para la actualizaciAn de usuarios.
 * Hereda todos los campos de CreateUserDto pero los hace opcionales.
 * Ideal para operaciones de tipo PATCH.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}

