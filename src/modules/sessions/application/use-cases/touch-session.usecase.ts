import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';

@Injectable()
export class TouchSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(sessionId: string, requesterUserId?: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) throw new UnauthorizedException('Sesion no encontrada');

    if (requesterUserId && session.userId !== requesterUserId) {
      throw new UnauthorizedException('No puedes modificar sesiones de otro usuario');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Sesion revocada');
    }

    const now = new Date();
    if (session.expiresAt && session.expiresAt <= now) {
      throw new UnauthorizedException('Sesion expirada');
    }

    await this.sessionRepository.updateLastSeen(sessionId, now);

    return { lastSeenAt: now };
  }
}
