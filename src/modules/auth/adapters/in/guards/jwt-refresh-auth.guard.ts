// auth/jwt-refresh-auth.guard.ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

/**
 * Guard que asegura que el request contiene un JWT de refresco valido.
 *
 * Este guard extiende la estrategia `jwt-refresh` definida en `JwtRefreshStrategy`.
 * Se utiliza para proteger las rutas que requieren un refresh token valido.
 */
@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const res = context.switchToHttp().getResponse<Response>();
      this.clearAuthCookies(res);
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    return user;
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    res.clearCookie('csrf_token');
  }
}
