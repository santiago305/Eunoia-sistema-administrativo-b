import { SetMetadata } from '@nestjs/common';

/**
 * Decorador personalizado para definir los roles que pueden acceder a un handler o controlador.
 *
 * Utiliza `SetMetadata` para asignar un arreglo de roles como metadatos,
 * que luego puede ser utilizado por guards como `RolesGuard` para controlar el acceso.
 *
 * @param roles - Lista de roles permitidos (como 'admin', 'user', etc.).
 * @returns Decorador que aAade los roles al handler o controlador.
 *
 * @example
 * ```ts
 * @Roles('admin', 'moderator')
 * @Get('admin-data')
 * getAdminData() {
 *   return 'Acceso solo para admins o moderadores';
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

