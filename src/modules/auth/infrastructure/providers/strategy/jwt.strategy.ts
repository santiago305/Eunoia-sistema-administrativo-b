import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from 'src/infrastructure/config/envs';
import { Request } from 'express';
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from 'src/modules/sessions/application/ports/session.repository';
import { getDeviceIdOrThrow } from 'src/shared/utilidades/utils/getOrCreateDeviceId.util';

/**
 * Estrategia para validar el access token JWT.
 * Extrae el token desde cookie o header y valida su firma.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {
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
      passReqToCallback: true, // <-- clave
    });
  }

  /**
   * Si el token es valido, Passport inyecta lo que retorne aqui en req.user.
   */
    async validate(req: Request, payload: any) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    const deviceId = getDeviceIdOrThrow(req);
    const session = await this.sessionRepository.findActiveByUserAndDevice(
      payload.sub,
      deviceId,
    );

    if (!session) {
      throw new UnauthorizedException('Sesion no encontrada');
    }

    return {
      id: payload.sub,
      role: payload.role,
    };
  }

}
