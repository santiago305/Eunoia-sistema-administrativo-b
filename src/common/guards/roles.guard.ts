import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from '../constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    //  Roles permitidos en el decorador @Roles(...)
    const allowedRoles = this.reflector.getAllAndOverride<RoleType[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles especAficos, deja pasar
    if (!allowedRoles || allowedRoles.length === 0) return true;

    //  Obtenemos el usuario autenticado desde JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log(' RolesGuard -> usuario recibido:', user);

    if (!user || !user.role) {
      throw new ForbiddenException('Usuario no autenticado o sin rol');
    }

    //  Si el rol del usuario no estA dentro de los permitidos
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Acceso denegado: rol insuficiente');
    }

    // A Todo bien A permitir acceso
    return true;
  }
}

