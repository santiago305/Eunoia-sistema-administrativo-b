import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from 'src/infrastructure/config/envs';
import { Request } from 'express';

/**
 * Estrategia para validar el access token JWT.
 * Extrae el token desde cookie o header y valida su firma.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Nota. Prioridad 1: cookie
        (req: Request) => req?.cookies?.access_token,
        // Nota. Prioridad 2: header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: envs.jwt.secret,
      issuer: envs.jwt.issuer,
    });
  }

  /**
   * Si el token es valido, Passport inyecta lo que retorne aqui en req.user.
   */
  async validate(payload: any) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    return {
      id: payload.sub,   // Este ID sera leido en @User()
      role: payload.role,
    };
  }
}
