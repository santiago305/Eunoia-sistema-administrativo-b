import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(sessionId: string, requesterUserId: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) throw new UnauthorizedException('Sesion no encontrada');

    if (session.userId !== requesterUserId) {
      throw new UnauthorizedException('No puedes cerrar sesiones de otro usuario');
    }

    if (session.revokedAt) return { revoked: true };

    const now = new Date();
    await this.sessionRepository.revoke(sessionId, now);

    return { revoked: true };
  }
}
