import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from 'src/infrastructure/config/envs';
import { Request } from 'express';
import {
  SESSION_READ_REPOSITORY,
  SessionReadRepository,
} from 'src/modules/sessions/application/ports/session-read.repository';

/**
 * Estrategia para validar el access token JWT.
 * Extrae el token desde cookie o header y valida su firma.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(SESSION_READ_REPOSITORY)
    private readonly sessionReadRepository: SessionReadRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Nota. Prioridad 1: cookie
        (req: Request) => req?.signedCookies?.access_token || req?.cookies?.access_token,
        // Nota. Prioridad 2: header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: envs.jwt.secret,
      issuer: envs.jwt.issuer,
      passReqToCallback: true, // <-- clave
    });
  }

  /**
   * Si el token es valido, Passport inyecta lo que retorne aqui en req.user.
   */
  async validate(req: Request, payload: any) {
    if (!payload?.sub || !payload?.sessionId) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    const session = await this.sessionReadRepository.findByIdAndUserId(
      payload.sessionId,
      payload.sub,
    );

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion invalida o expirada');
    }

    return {
      id: payload.sub,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }
}
