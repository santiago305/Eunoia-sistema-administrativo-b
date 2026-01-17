import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';

/**
 * DTO para actualizar un rol existente.
 *
 * Este DTO hereda todas las propiedades del `CreateRoleDto` pero las hace opcionales,
 * lo cual permite enviar solo los campos que se quieren actualizar.
 *
 * @extends PartialType<CreateRoleDto>
 *
 * @example
 * // Solo actualiza la descripciAn del rol
 * {
 *   "description": "nuevo_rol"
 * }
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

