import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';

@Injectable()
export class UpdateSessionRefreshUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    requesterUserId?: string,
  ) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) throw new UnauthorizedException('Sesion no encontrada');

    if (requesterUserId && session.userId !== requesterUserId) {
      throw new UnauthorizedException('No puedes modificar sesiones de otro usuario');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Sesion revocada');
    }

    const normalizedHash = refreshTokenHash?.trim();
    if (!normalizedHash) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    await this.sessionRepository.updateRefreshTokenHash(sessionId, normalizedHash, expiresAt);

    return { rotated: true };
  }
}
