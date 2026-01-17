// auth/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que asegura que el request contiene un JWT valido.
 *
 * Este guard extiende la estrategia `jwt` definida en `JwtStrategy`.
 * Se utiliza para proteger las rutas que requieren que el usuario este
 * autenticado mediante un access token.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
