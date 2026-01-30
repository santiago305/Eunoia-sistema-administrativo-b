import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from 'src/modules/sessions/application/ports/session.repository';
import { getDeviceIdOrThrow } from 'src/shared/utilidades/utils/getOrCreateDeviceId.util';

@Injectable()
export class JwtSessionAuthGuard extends JwtAuthGuard {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const ok = await super.canActivate(context);
    if (!ok) return false;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    const deviceId = getDeviceIdOrThrow(req);
    const session = await this.sessionRepository.findActiveByUserAndDevice(
      userId,
      deviceId,
    );
    if (!session) {
      throw new UnauthorizedException('Sesion no encontrada');
    }

    return true;
  }
}
